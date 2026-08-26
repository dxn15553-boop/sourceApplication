import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests, workflowActions } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { WorkflowActionPayload, WorkflowStatus, Role, WorkflowTrigger } from '@/lib/types';

const TRANSITIONS: Record<string, {
  allowedRoles: Role[];
  allowedStatuses: WorkflowStatus[];
  nextStatus: WorkflowStatus;
  nextRole: Role | null;
  requiresComment: boolean;
}> = {
  'reject:hod': { allowedRoles: ['hod'], allowedStatuses: ['Submitted', 'Returned to HOD', 'Pending Home HOD Confirmation'], nextStatus: 'HOD Rejected', nextRole: null, requiresComment: true },
  'return:hod': { allowedRoles: ['hod'], allowedStatuses: ['Submitted', 'Returned to HOD', 'Pending Home HOD Confirmation'], nextStatus: 'Returned to Requester', nextRole: 'user', requiresComment: true },
  'approve:regional_coordinator': { allowedRoles: ['regional_coordinator'], allowedStatuses: ['Regional Coordinator Review', 'HOD Approved'], nextStatus: 'Final Head Review', nextRole: 'final_head', requiresComment: false },
  'reject:regional_coordinator': { allowedRoles: ['regional_coordinator'], allowedStatuses: ['Regional Coordinator Review', 'HOD Approved'], nextStatus: 'HOD Rejected', nextRole: null, requiresComment: true },
  'return:regional_coordinator': { allowedRoles: ['regional_coordinator'], allowedStatuses: ['Regional Coordinator Review', 'HOD Approved'], nextStatus: 'Returned to HOD', nextRole: 'hod', requiresComment: true },
  'resubmit:regional_coordinator': { allowedRoles: ['regional_coordinator'], allowedStatuses: ['Returned to Regional Coordinator'], nextStatus: 'Regional Coordinator Review', nextRole: 'regional_coordinator', requiresComment: false },
  'approve:final_head': { allowedRoles: ['final_head'], allowedStatuses: ['Final Head Review', 'Returned to Regional Head'], nextStatus: 'Final Head Approved', nextRole: 'procurement_manager', requiresComment: false },
  'reject:final_head': { allowedRoles: ['final_head'], allowedStatuses: ['Final Head Review', 'Returned to Regional Head'], nextStatus: 'Final Head Rejected', nextRole: null, requiresComment: true },
  'return:final_head': { allowedRoles: ['final_head'], allowedStatuses: ['Final Head Review', 'Returned to Regional Head'], nextStatus: 'Returned to Regional Coordinator', nextRole: 'regional_coordinator', requiresComment: true },
  'approve:procurement_manager': { allowedRoles: ['procurement_manager'], allowedStatuses: ['Final Head Approved'], nextStatus: 'Procurement Approved', nextRole: 'section_manager', requiresComment: false },
  'reject:procurement_manager': { allowedRoles: ['procurement_manager'], allowedStatuses: ['Final Head Approved'], nextStatus: 'Procurement Rejected', nextRole: null, requiresComment: true },
  'return:procurement_manager': { allowedRoles: ['procurement_manager'], allowedStatuses: ['Final Head Approved'], nextStatus: 'Returned to Regional Head', nextRole: 'final_head', requiresComment: true },
  'assign:section_manager': { allowedRoles: ['section_manager'], allowedStatuses: ['Procurement Approved'], nextStatus: 'Assigned', nextRole: 'employee', requiresComment: false },
  'complete:employee': { allowedRoles: ['employee'], allowedStatuses: ['Assigned'], nextStatus: 'Completed', nextRole: null, requiresComment: false },
  'resubmit:hod': { allowedRoles: ['hod'], allowedStatuses: ['Returned to HOD'], nextStatus: 'HOD Approved', nextRole: 'regional_coordinator', requiresComment: false },
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
      with: { department: { columns: { name: true } } }
    });

    if (!srcRequest) return Response.json({ error: 'Request not found' }, { status: 404 });

    const body = await request.json();
    const { action, comment, assigned_employee_id, return_to, department_ids } = body;

    const transitionKey = `${action}:${user.role}`;
    let transition = TRANSITIONS[transitionKey];
    let nextStatus = transition?.nextStatus;
    let nextRole = transition?.nextRole;
    
    // Dynamic HOD Approval Logic
    if (user.role === 'hod' && action === 'approve') {
      const isHomeHod = user.departmentIds?.includes(srcRequest.requester_department_id);
      const isTargetHod = user.departmentIds?.includes(srcRequest.department_id);
      
      if (!isHomeHod && !isTargetHod) {
        return Response.json({ error: 'You can only review requests for your department' }, { status: 403 });
      }
      
      if (srcRequest.status === 'Submitted' || srcRequest.status === 'Returned to HOD') {
        if (!isHomeHod) return Response.json({ error: 'Only the Home HOD can approve at this stage' }, { status: 403 });
        
        if (department_ids && department_ids.length > 0) {
          const { profileDepartments, profiles, departments, requiredReviews } = await import('@/lib/db/schema');

          // Query departments and their HOD profiles to check logins
          const deptsWithHod = await db.select({
            deptId: departments.id,
            deptName: departments.name,
            hodId: profiles.id,
          })
          .from(departments)
          .leftJoin(profileDepartments, eq(profileDepartments.department_id, departments.id))
          .leftJoin(profiles, and(eq(profiles.id, profileDepartments.profile_id), eq(profiles.role, 'hod')))
          .where(inArray(departments.id, department_ids));

          // Find departments that do not have an HOD profile configured
          const missingHods: string[] = [];
          for (const deptId of department_ids) {
            const hasHod = deptsWithHod.some(d => d.deptId === deptId && d.hodId !== null);
            if (!hasHod) {
              const deptName = deptsWithHod.find(d => d.deptId === deptId)?.deptName || deptId;
              missingHods.push(deptName);
            }
          }

          if (missingHods.length > 0) {
            const names = missingHods.join(', ');
            return Response.json({ 
              error: `Request cannot be sent because ${names} does not have login credentials configured. Please create the department login first.` 
            }, { status: 400 });
          }

          await db.insert(requiredReviews).values(
            department_ids.map((deptId: string) => ({
              request_id: id,
              department_id: deptId,
              status: 'Pending' as const,
            }))
          );
          nextStatus = 'Under Required Review';
          nextRole = 'hod';
        } else {
          if (srcRequest.department_id === srcRequest.requester_department_id) {
            nextStatus = 'Regional Coordinator Review';
            nextRole = 'regional_coordinator';
          } else {
            nextStatus = 'Under Required Review';
            nextRole = 'hod';
          }
        }
      } else if (srcRequest.status === 'Under Required Review') {
        if (!isTargetHod) return Response.json({ error: 'Only the Target HOD can approve at this stage' }, { status: 403 });
        
        nextStatus = 'Pending Home HOD Confirmation';
        nextRole = 'hod';
        
        // Mark required review as approved
        const { requiredReviews } = await import('@/lib/db/schema');
        await db.update(requiredReviews)
          .set({ status: 'Approved', reviewer_id: user.id, reviewed_at: new Date() })
          .where(and(eq(requiredReviews.request_id, id), eq(requiredReviews.department_id, srcRequest.department_id)));
          
      } else if (srcRequest.status === 'Pending Home HOD Confirmation' || srcRequest.status === 'Target Dept Approved') {
        if (!isHomeHod) return Response.json({ error: 'Only the Home HOD can approve at this stage' }, { status: 403 });
        nextStatus = 'Regional Coordinator Review';
        nextRole = 'regional_coordinator';
      } else {
        return Response.json({ error: `Action 'approve' not valid in status '${srcRequest.status}'` }, { status: 400 });
      }
      
      transition = { allowedRoles: ['hod'], allowedStatuses: [], nextStatus, nextRole, requiresComment: false };
    }

    // Requester Resubmission Logic Override
    if (action === 'resubmit' && srcRequest.requester_id === user.id) {
      const allowedStatuses: WorkflowStatus[] = ['HOD Returned', 'Final Head Returned', 'Procurement Returned', 'Returned to Requester'];
      if (allowedStatuses.includes(srcRequest.status)) {
        nextStatus = 'Submitted';
        nextRole = 'hod';
        transition = { allowedRoles: [user.role], allowedStatuses, nextStatus, nextRole, requiresComment: false };
      }
    }

    if (!transition) return Response.json({ error: 'Action not permitted for your role' }, { status: 403 });
    if (action !== 'approve' || user.role !== 'hod') {
      if (!transition.allowedStatuses.includes(srcRequest.status)) {
        return Response.json({ error: `Action '${action}' not valid in status '${srcRequest.status}'` }, { status: 400 });
      }
    }
    if (transition.requiresComment && !comment?.trim()) {
      return Response.json({ error: 'A comment/reason is required for this action' }, { status: 400 });
    }

    if (user.role === 'hod' && action !== 'approve') {
      const isHomeHod = user.departmentIds?.includes(srcRequest.requester_department_id);
      const isTargetHod = user.departmentIds?.includes(srcRequest.department_id);
      if (!isHomeHod && !isTargetHod) {
        return Response.json({ error: 'You can only review requests for your department' }, { status: 403 });
      }
    }
    if (user.role === 'employee' && action === 'complete' && srcRequest.assigned_employee_id !== user.id) {
      return Response.json({ error: 'You can only complete requests assigned to you' }, { status: 403 });
    }
    if (action === 'assign' && !assigned_employee_id) {
      return Response.json({ error: 'An employee must be selected for assignment' }, { status: 400 });
    }

    // Add required review automatically on step 1 approval IF target dept is different and not already inserted
    if (user.role === 'hod' && action === 'approve' && (srcRequest.status === 'Submitted' || srcRequest.status === 'Returned to HOD')) {
      if (srcRequest.department_id !== srcRequest.requester_department_id) {
        const { requiredReviews } = await import('@/lib/db/schema');
        const existing = await db.query.requiredReviews.findFirst({
          where: and(eq(requiredReviews.request_id, id), eq(requiredReviews.department_id, srcRequest.department_id))
        });
        const inPayload = department_ids && department_ids.includes(srcRequest.department_id);
        if (!existing && !inPayload) {
          await db.insert(requiredReviews).values({
            request_id: id,
            department_id: srcRequest.department_id, // Target department
            status: 'Pending',
          });
        }
      }
    }

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
      } else if (return_to === 'regional_coordinator') {
        nextStatus = 'Returned to Regional Coordinator';
        nextRole = 'regional_coordinator';
      }
    }

    const updatePayload: any = {
      status: nextStatus,
      current_assignee_role: nextRole,
      updated_at: new Date(),
    };
    if (action === 'assign' && assigned_employee_id) {
      updatePayload.assigned_employee_id = assigned_employee_id;

      const procurementDbUrl = process.env.PROCUREMENT_DATABASE_URL;
      if (procurementDbUrl) {
        try {
          const { neon } = await import('@neondatabase/serverless');
          const pSql = neon(procurementDbUrl);

          // 1. Get the department name of this request
          const deptName = (srcRequest as any).department?.name;
          let procurementDeptId = null;

          if (deptName) {
            // Find matching department in procurement database
            const deptRows = await pSql`
              SELECT id FROM "Department" 
              WHERE name ILIKE ${deptName.trim()} LIMIT 1
            `;
            if (deptRows.length > 0) {
              procurementDeptId = deptRows[0].id;
            } else {
              // Create it if it doesn't exist
              const newDeptId = crypto.randomUUID();
              await pSql`
                INSERT INTO "Department" (id, name, code, "isActive", "createdAt", "updatedAt")
                VALUES (${newDeptId}, ${deptName.trim()}, ${deptName.trim().toUpperCase().substring(0, 6)}, true, NOW(), NOW())
              `;
              procurementDeptId = newDeptId;
            }
          }

          // 2. Find a manager in the procurement database for createdById
          const managerRows = await pSql`
            SELECT id FROM "User" 
            WHERE role = 'MANAGER' LIMIT 1
          `;
          const createdById = managerRows.length > 0 ? managerRows[0].id : null;

          if (procurementDeptId && createdById) {
            // 3. Check if ProcurementRequest already exists
            const existingRows = await pSql`
              SELECT id FROM "ProcurementRequest" 
              WHERE "sourceNo" = ${srcRequest.id} LIMIT 1
            `;

            if (existingRows.length > 0) {
              // Update existing request
              await pSql`
                UPDATE "ProcurementRequest"
                SET "handlerId" = ${assigned_employee_id}, "updatedAt" = NOW()
                WHERE "sourceNo" = ${srcRequest.id}
              `;
            } else {
              // Insert new request
              await pSql`
                INSERT INTO "ProcurementRequest" (
                  id, "sourceNo", "sourceDate", "sourceDescription", 
                  "departmentId", "handlerId", "createdById", "createdAt", "updatedAt",
                  "csStatus", "prStatus", "poStatus", "paymentStatus", "currentStage", "slaStatus"
                ) VALUES (
                  ${crypto.randomUUID()}, 
                  ${srcRequest.id}, 
                  ${srcRequest.created_at}, 
                  ${srcRequest.description}, 
                  ${procurementDeptId}, 
                  ${assigned_employee_id}, 
                  ${createdById}, 
                  NOW(), NOW(),
                  'PENDING', 'PENDING', 'PENDING', 'PENDING', 'CS', 'ON_TRACK'
                )
              `;
            }
          } else {
            console.error('Could not find department or manager in procurement database', { procurementDeptId, createdById });
          }
        } catch (err) {
          console.error('Error sync assigning to procurement database:', err);
        }
      }
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
