import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests, profiles, departments, requestCounter, workflowActions } from '@/lib/db/schema';
import { eq, desc, ilike, and, or, sql, inArray } from 'drizzle-orm';
import { cookies } from 'next/headers';
import type { CreateRequestPayload } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user as any;

    const activeDepartmentId = user.departmentIds?.[0] || null;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    const conditions = [];

    // Role-based filtering
    switch (user.role) {
      case 'user':
        if (activeDepartmentId) {
          conditions.push(or(
            eq(sourceRequests.requester_department_id, activeDepartmentId),
            eq(sourceRequests.department_id, activeDepartmentId)
          ));
        } else conditions.push(eq(sourceRequests.id, 'none'));
        break;

      case 'hod':
        if (activeDepartmentId) {
          conditions.push(or(
            eq(sourceRequests.requester_department_id, activeDepartmentId),
            eq(sourceRequests.department_id, activeDepartmentId)
          ));
        } else conditions.push(eq(sourceRequests.id, 'none'));
        break;
      case 'admin':
        break; // Sees all
      default:
        if (user.role === 'employee') {
          conditions.push(or(
            eq(sourceRequests.assigned_employee_id, user.id),
            eq(sourceRequests.current_assignee_role, 'employee'),
            eq(sourceRequests.requester_id, user.id)
          ));
        }
        break;
    }

    if (status) conditions.push(eq(sourceRequests.status, status as any));
    if (search) conditions.push(ilike(sourceRequests.id, `%${search}%`));

    const data = await db.query.sourceRequests.findMany({
      where: and(...conditions),
      with: {
        requester: { columns: { id: true, full_name: true, role: true } },
        department: { columns: { id: true, name: true } },
        assigned_employee: { columns: { id: true, full_name: true } }
      },
      orderBy: [desc(sourceRequests.created_at)],
    });

    return Response.json({ data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user as any;

    // Allow any authenticated user (including HODs) to create a source request
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateRequestPayload = await request.json();
    
    // Resolve user's department or form department
    let userDeptId = user.departmentIds?.[0] || null;
    let selectedDeptId = body.department_id || (body.department_ids && body.department_ids[0]) || null;

    // If user has no department assigned, fallback to selectedDeptId or fetch the first default department
    if (!userDeptId && selectedDeptId) {
      userDeptId = selectedDeptId;
    }
    if (!userDeptId && !selectedDeptId) {
      const defaultDept = await db.query.departments.findFirst();
      if (defaultDept) {
        userDeptId = defaultDept.id;
        selectedDeptId = defaultDept.id;
      }
    }

    const primaryDeptId = selectedDeptId || userDeptId;
    if (!primaryDeptId) {
      return Response.json({ error: 'Department selection is required' }, { status: 400 });
    }

    if (!body.description?.trim()) {
      return Response.json({ error: 'Description is required' }, { status: 400 });
    }

    // Safely parse required_by_date
    let parsedRequiredByDate: Date | null = null;
    if (body.required_by_date) {
      const d = new Date(body.required_by_date);
      if (!isNaN(d.getTime())) {
        parsedRequiredByDate = d;
      }
    }

    const year = new Date().getFullYear();

    // Increment request counter transactionally
    const [counterResult] = await db
      .insert(requestCounter)
      .values({ year, last_seq: 1 })
      .onConflictDoUpdate({
        target: requestCounter.year,
        set: { last_seq: sql`${requestCounter.last_seq} + 1` }
      })
      .returning();

    const seq = String(counterResult.last_seq).padStart(4, '0');
    const srcId = `SRC-${year}-${seq}`;

    // Insert request
    const [newRequest] = await db.insert(sourceRequests).values({
      id: srcId,
      requester_id: user.id,
      requester_name: body.requester_name?.trim() ?? user.name ?? null,
      requester_designation: body.requester_designation?.trim() ?? null,
      requester_department_id: userDeptId,
      department_id: primaryDeptId,
      description: body.description.trim(),
      priority: body.priority?.trim() || 'Medium',
      required_by_date: parsedRequiredByDate,
      purpose_justification: body.purpose_justification?.trim() || null,
      attachment_path: body.attachment_path ?? null,
      attachment_name: body.attachment_name ?? null,
      attachments: body.attachments ? (typeof body.attachments === 'string' ? body.attachments : JSON.stringify(body.attachments)) : null,
      status: 'Submitted',
      current_assignee_role: 'hod',
    }).returning();

    // Insert cross-department reviews if HOD submitted multi-department request
    if (user.role === 'hod' && body.department_ids && body.department_ids.length > 0) {
      const crossDeptIds = body.department_ids.filter(id => id && id !== userDeptId);
      if (crossDeptIds.length > 0) {
        const { requiredReviews } = await import('@/lib/db/schema');
        await db.insert(requiredReviews).values(
          crossDeptIds.map(deptId => ({
            request_id: srcId,
            department_id: deptId,
            status: 'Pending' as const,
          }))
        );
      }
    }

    await db.insert(workflowActions).values({
      request_id: srcId,
      actor_id: user.id,
      action: 'submitted',
      comment: null,
    });

    return Response.json({ data: newRequest }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating source request:', err);
    return Response.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
