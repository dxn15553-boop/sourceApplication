import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests, profiles, departments, requestCounter, workflowActions } from '@/lib/db/schema';
import { eq, desc, ilike, and, or, sql } from 'drizzle-orm';
import type { CreateRequestPayload } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user as any;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    const conditions = [];

    // Role-based filtering
    switch (user.role) {
      case 'user':
        conditions.push(eq(sourceRequests.requester_id, user.id));
        break;
      case 'hod':
        conditions.push(eq(sourceRequests.department_id, user.department_id));
        break;
      case 'admin':
        break; // Sees all
      default:
        if (user.role === 'employee') {
          conditions.push(or(
            eq(sourceRequests.assigned_employee_id, user.id),
            eq(sourceRequests.current_assignee_role, 'employee')
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

    if (user.role !== 'user' && user.role !== 'admin') {
      return Response.json({ error: 'Only users can create source requests' }, { status: 403 });
    }
    if (!user.department_id) {
      return Response.json({ error: 'You must be assigned to a department' }, { status: 400 });
    }

    const body: CreateRequestPayload = await request.json();

    if (!body.description?.trim()) {
      return Response.json({ error: 'Description is required' }, { status: 400 });
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

    // Insert request inside transaction logic (simplified with awaiting consecutive inserts)
    const [newRequest] = await db.insert(sourceRequests).values({
      id: srcId,
      requester_id: user.id,
      department_id: user.department_id,
      description: body.description.trim(),
      attachment_path: body.attachment_path ?? null,
      attachment_name: body.attachment_name ?? null,
      status: 'Submitted',
      current_assignee_role: 'hod',
    }).returning();

    await db.insert(workflowActions).values({
      request_id: srcId,
      actor_id: user.id,
      action: 'submitted',
      comment: null,
    });

    return Response.json({ data: newRequest }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
