import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: Request,
  ctx: RouteContext<'/api/requests/[id]'>
) {
  try {
    const { id } = await ctx.params;
    const session = await auth();
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await db.query.sourceRequests.findFirst({
      where: eq(sourceRequests.id, id),
      with: {
        requester: {
          with: { profileDepartments: { with: { department: { columns: { id: true, name: true } } } } }
        },
        department: { columns: { id: true, name: true } },
        assigned_employee: { columns: { id: true, full_name: true, role: true } },
        workflow_actions: {
          columns: { id: true, action: true, comment: true, created_at: true },
          with: { actor: { columns: { id: true, full_name: true, role: true } } },
          orderBy: (actions: any, { asc }: any) => [asc(actions.created_at)],
        }
      }
    });

    if (!data) return Response.json({ error: 'Request not found' }, { status: 404 });

    return Response.json({ data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]'>
) {
  try {
    const { id } = await ctx.params;
    const session = await auth();
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user as any;

    const srcRequest = await db.query.sourceRequests.findFirst({
      where: eq(sourceRequests.id, id),
    });

    if (!srcRequest) return Response.json({ error: 'Request not found' }, { status: 404 });

    const isHomeHod = user.role === 'hod' && user.departmentIds?.includes(srcRequest.requester_department_id);
    const isRequester = srcRequest.requester_id === user.id;

    // Authorize: Home HOD can edit when Returned to HOD. Requester can edit when in returned states.
    const canEdit =
      (isHomeHod && srcRequest.status === 'Returned to HOD') ||
      (isRequester && ['Returned to Requester', 'HOD Returned', 'Final Head Returned', 'Procurement Returned'].includes(srcRequest.status));

    if (!canEdit) {
      return Response.json({ error: 'You are not authorized to edit this request in its current status' }, { status: 403 });
    }

    const body = await request.json();
    const { requester_name, requester_designation, description, attachment_path, attachment_name } = body;

    const updatePayload: any = {
      updated_at: new Date(),
    };

    if (requester_name !== undefined) updatePayload.requester_name = requester_name;
    if (requester_designation !== undefined) updatePayload.requester_designation = requester_designation;
    if (description !== undefined) updatePayload.description = description;
    
    // Support clearing the attachment (setting path and name to null)
    updatePayload.attachment_path = attachment_path === null ? null : (attachment_path || undefined);
    updatePayload.attachment_name = attachment_name === null ? null : (attachment_name || undefined);

    await db.update(sourceRequests).set(updatePayload).where(eq(sourceRequests.id, id));

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

