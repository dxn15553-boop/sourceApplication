import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests, workflowActions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { WorkflowActionPayload, WorkflowStatus, Role, WorkflowTrigger } from '@/lib/types';

const TRANSITIONS: Record<string, {
  allowedRoles: Role[];
  allowedStatuses: WorkflowStatus[];
  nextStatus: WorkflowStatus;
  nextRole: Role | null;
  requiresComment: boolean;
}> = {
  'approve:hod': { allowedRoles: ['hod'], allowedStatuses: ['Submitted', 'Returned to HOD'], nextStatus: 'HOD Approved', nextRole: 'final_head', requiresComment: false },
  'reject:hod': { allowedRoles: ['hod'], allowedStatuses: ['Submitted', 'Returned to HOD'], nextStatus: 'HOD Rejected', nextRole: null, requiresComment: true },
  'return:hod': { allowedRoles: ['hod'], allowedStatuses: ['Submitted', 'Returned to HOD'], nextStatus: 'Returned to Requester', nextRole: 'user', requiresComment: true },
  'approve:final_head': { allowedRoles: ['final_head'], allowedStatuses: ['HOD Approved', 'Final Head Review', 'Under Required Review', 'Returned to Regional Head'], nextStatus: 'Final Head Approved', nextRole: 'procurement_manager', requiresComment: false },
  'reject:final_head': { allowedRoles: ['final_head'], allowedStatuses: ['HOD Approved', 'Final Head Review', 'Under Required Review', 'Returned to Regional Head'], nextStatus: 'Final Head Rejected', nextRole: null, requiresComment: true },
  'return:final_head': { allowedRoles: ['final_head'], allowedStatuses: ['HOD Approved', 'Final Head Review', 'Under Required Review', 'Returned to Regional Head'], nextStatus: 'Returned to HOD', nextRole: 'hod', requiresComment: true },
  'approve:procurement_manager': { allowedRoles: ['procurement_manager'], allowedStatuses: ['Final Head Approved'], nextStatus: 'Procurement Approved', nextRole: 'section_manager', requiresComment: false },
  'reject:procurement_manager': { allowedRoles: ['procurement_manager'], allowedStatuses: ['Final Head Approved'], nextStatus: 'Procurement Rejected', nextRole: null, requiresComment: true },
  'return:procurement_manager': { allowedRoles: ['procurement_manager'], allowedStatuses: ['Final Head Approved'], nextStatus: 'Returned to Regional Head', nextRole: 'final_head', requiresComment: true },
  'assign:section_manager': { allowedRoles: ['section_manager'], allowedStatuses: ['Procurement Approved'], nextStatus: 'Assigned', nextRole: 'employee', requiresComment: false },
  'complete:employee': { allowedRoles: ['employee'], allowedStatuses: ['Assigned'], nextStatus: 'Completed', nextRole: null, requiresComment: false },
  'resubmit:user': { allowedRoles: ['user'], allowedStatuses: ['HOD Returned', 'Final Head Returned', 'Procurement Returned', 'Returned to Requester'], nextStatus: 'Submitted', nextRole: 'hod', requiresComment: false },
  'resubmit:hod': { allowedRoles: ['hod'], allowedStatuses: ['Returned to HOD'], nextStatus: 'HOD Approved', nextRole: 'final_head', requiresComment: false },
  'resubmit:final_head': { allowedRoles: ['final_head'], allowedStatuses: ['Returned to Regional Head'], nextStatus: 'Final Head Approved', nextRole: 'procurement_manager', requiresComment: false },
};

const ACTION_MAP: Record<WorkflowTrigger, import('@/lib/types').WorkflowAction> = {
  approve: 'approved',
  reject: 'rejected',
  return: 'returned',
  resubmit: 'resubmitted',
  assign: 'assigned',
  evaluate_vendor: 'vendor_selected',
  create_pr: 'pr_created',
  create_po: 'po_created',
  log_payment: 'payment_done',
  log_delivery: 'delivered',
  close_request: 'closed',
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

    const body = await request.json();
    const { action, comment, assigned_employee_id, return_to } = body;

    const transitionKey = `${action}:${user.role}`;
    const transition = TRANSITIONS[transitionKey];

    if (!transition) return Response.json({ error: 'Action not permitted for your role' }, { status: 403 });
    if (!transition.allowedStatuses.includes(srcRequest.status)) {
      return Response.json({ error: `Action '${action}' not valid in status '${srcRequest.status}'` }, { status: 400 });
    }
    if (transition.requiresComment && !comment?.trim()) {
      return Response.json({ error: 'A comment/reason is required for this action' }, { status: 400 });
    }

    if (user.role === 'hod' && !user.departmentIds?.includes(srcRequest.department_id)) {
      return Response.json({ error: 'You can only review requests from your department' }, { status: 403 });
    }
    if (user.role === 'employee' && action === 'complete' && srcRequest.assigned_employee_id !== user.id) {
      return Response.json({ error: 'You can only complete requests assigned to you' }, { status: 403 });
    }
    if (action === 'assign' && !assigned_employee_id) {
      return Response.json({ error: 'An employee must be selected for assignment' }, { status: 400 });
    }

    let nextStatus = transition.nextStatus;
    let nextRole = transition.nextRole;

    if (action === 'return' && return_to) {
      if (return_to === 'user') {
        nextStatus = 'Returned to Requester';
        nextRole = 'user';
      } else if (return_to === 'hod') {
        nextStatus = 'Returned to HOD';
        nextRole = 'hod';
      } else if (return_to === 'final_head') {
        nextStatus = 'Returned to Regional Head';
        nextRole = 'final_head';
      }
    }

    const updatePayload: any = {
      status: nextStatus,
      current_assignee_role: nextRole,
      updated_at: new Date(),
    };
    if (action === 'assign' && assigned_employee_id) {
      updatePayload.assigned_employee_id = assigned_employee_id;
    }

    await db.update(sourceRequests).set(updatePayload).where(eq(sourceRequests.id, id));
    
    await db.insert(workflowActions).values({
      request_id: id,
      actor_id: user.id,
      action: ACTION_MAP[action as WorkflowTrigger],
      comment: comment?.trim() || null,
    });

    return Response.json({ success: true, new_status: nextStatus });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
