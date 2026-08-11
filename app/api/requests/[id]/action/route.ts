import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests, workflowActions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { WorkflowActionPayload, WorkflowStatus, Role, WorkflowTrigger } from '@/lib/types';

const TRANSITIONS: Record<string, {
  allowedRoles: Role[];
  allowedStatuses: WorkflowStatus[];
  nextStatus: WorkflowStatus;
  nextRole: Role | null;
  requiresComment: boolean;
}> = {
  'approve:hod': { allowedRoles: ['hod'], allowedStatuses: ['Submitted'], nextStatus: 'HOD Approved', nextRole: 'final_head', requiresComment: false },
  'reject:hod': { allowedRoles: ['hod'], allowedStatuses: ['Submitted'], nextStatus: 'HOD Rejected', nextRole: null, requiresComment: true },
  'return:hod': { allowedRoles: ['hod'], allowedStatuses: ['Submitted'], nextStatus: 'HOD Returned', nextRole: 'user', requiresComment: true },
  'approve:final_head': { allowedRoles: ['final_head'], allowedStatuses: ['HOD Approved'], nextStatus: 'Final Head Approved', nextRole: 'procurement_manager', requiresComment: false },
  'reject:final_head': { allowedRoles: ['final_head'], allowedStatuses: ['HOD Approved'], nextStatus: 'Final Head Rejected', nextRole: null, requiresComment: true },
  'return:final_head': { allowedRoles: ['final_head'], allowedStatuses: ['HOD Approved'], nextStatus: 'Final Head Returned', nextRole: 'user', requiresComment: true },
  'approve:procurement_manager': { allowedRoles: ['procurement_manager'], allowedStatuses: ['Final Head Approved'], nextStatus: 'Procurement Approved', nextRole: 'section_manager', requiresComment: false },
  'reject:procurement_manager': { allowedRoles: ['procurement_manager'], allowedStatuses: ['Final Head Approved'], nextStatus: 'Procurement Rejected', nextRole: null, requiresComment: true },
  'return:procurement_manager': { allowedRoles: ['procurement_manager'], allowedStatuses: ['Final Head Approved'], nextStatus: 'Procurement Returned', nextRole: 'user', requiresComment: true },
  'assign:section_manager': { allowedRoles: ['section_manager'], allowedStatuses: ['Procurement Approved'], nextStatus: 'Assigned', nextRole: 'employee', requiresComment: false },
  'complete:employee': { allowedRoles: ['employee'], allowedStatuses: ['Assigned'], nextStatus: 'Completed', nextRole: null, requiresComment: false },
  'resubmit:user': { allowedRoles: ['user'], allowedStatuses: ['HOD Returned', 'Final Head Returned', 'Procurement Returned'], nextStatus: 'Submitted', nextRole: 'hod', requiresComment: false },
};

const ACTION_MAP: Record<WorkflowTrigger, import('@/lib/types').WorkflowAction> = {
  approve: 'approved',
  reject: 'rejected',
  return: 'returned',
  resubmit: 'resubmitted',
  assign: 'assigned',
  complete: 'completed',
};

export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/action'>
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

    const body: WorkflowActionPayload = await request.json();
    const { action, comment, assigned_employee_id } = body;

    const transitionKey = `${action}:${user.role}`;
    const transition = TRANSITIONS[transitionKey];

    if (!transition) return Response.json({ error: 'Action not permitted for your role' }, { status: 403 });
    if (!transition.allowedStatuses.includes(srcRequest.status)) {
      return Response.json({ error: `Action '${action}' not valid in status '${srcRequest.status}'` }, { status: 400 });
    }
    if (transition.requiresComment && !comment?.trim()) {
      return Response.json({ error: 'A comment/reason is required for this action' }, { status: 400 });
    }

    if (user.role === 'hod' && srcRequest.department_id !== user.department_id) {
      return Response.json({ error: 'You can only review requests from your department' }, { status: 403 });
    }
    if (user.role === 'employee' && action === 'complete' && srcRequest.assigned_employee_id !== user.id) {
      return Response.json({ error: 'You can only complete requests assigned to you' }, { status: 403 });
    }
    if (action === 'assign' && !assigned_employee_id) {
      return Response.json({ error: 'An employee must be selected for assignment' }, { status: 400 });
    }

    const updatePayload: any = {
      status: transition.nextStatus,
      current_assignee_role: transition.nextRole,
      updated_at: new Date(),
    };
    if (action === 'assign' && assigned_employee_id) {
      updatePayload.assigned_employee_id = assigned_employee_id;
    }

    await db.update(sourceRequests).set(updatePayload).where(eq(sourceRequests.id, id));
    
    await db.insert(workflowActions).values({
      request_id: id,
      actor_id: user.id,
      action: ACTION_MAP[action],
      comment: comment?.trim() || null,
    });

    return Response.json({ success: true, new_status: transition.nextStatus });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
