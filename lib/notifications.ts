import { db } from '@/lib/db';
import { notifications, profiles, profileDepartments } from '@/lib/db/schema';
import { eq, and, inArray, ne } from 'drizzle-orm';
import type { Role } from '@/lib/types';

export interface NewRequestNotificationParams {
  requestId: string;
  departmentId: string;
  requesterName?: string | null;
  description: string;
  priority?: string | null;
}

/**
 * Notifies the Home HOD(s) when a new source request is submitted.
 */
export async function notifyHodsForNewRequest({
  requestId,
  departmentId,
  requesterName,
  description,
  priority,
}: NewRequestNotificationParams) {
  try {
    const hods = await db
      .select({
        id: profiles.id,
      })
      .from(profiles)
      .innerJoin(profileDepartments, eq(profileDepartments.profile_id, profiles.id))
      .where(
        and(
          eq(profiles.role, 'hod'),
          eq(profileDepartments.department_id, departmentId)
        )
      );

    if (hods.length === 0) {
      console.warn(`[notifyHodsForNewRequest] No HOD found for department ${departmentId}`);
      return;
    }

    const snippet = description.length > 90 ? `${description.slice(0, 90)}...` : description;
    const priorityBadge = priority ? ` [${priority.toUpperCase()}]` : '';

    const entries = hods.map(hod => ({
      user_id: hod.id,
      request_id: requestId,
      title: `New Source Request: ${requestId}${priorityBadge}`,
      message: `${requesterName || 'A team member'} submitted a new request: "${snippet}". Action required.`,
      is_read: false,
    }));

    await db.insert(notifications).values(entries);
  } catch (err) {
    console.error('[notifyHodsForNewRequest] Error creating notifications:', err);
  }
}

/**
 * Notifies HODs of cross-functional review departments when multi-department review is needed.
 */
export async function notifyCrossDeptHods({
  requestId,
  departmentIds,
  description,
}: {
  requestId: string;
  departmentIds: string[];
  description: string;
}) {
  try {
    if (!departmentIds || departmentIds.length === 0) return;

    const crossHods = await db
      .select({
        id: profiles.id,
        deptId: profileDepartments.department_id,
      })
      .from(profiles)
      .innerJoin(profileDepartments, eq(profileDepartments.profile_id, profiles.id))
      .where(
        and(
          eq(profiles.role, 'hod'),
          inArray(profileDepartments.department_id, departmentIds)
        )
      );

    if (crossHods.length === 0) return;

    const snippet = description.length > 80 ? `${description.slice(0, 80)}...` : description;

    const entries = crossHods.map(hod => ({
      user_id: hod.id,
      request_id: requestId,
      title: `Required Review: ${requestId}`,
      message: `Your department's review and approval is required for request ${requestId}: "${snippet}".`,
      is_read: false,
    }));

    await db.insert(notifications).values(entries);
  } catch (err) {
    console.error('[notifyCrossDeptHods] Error creating notifications:', err);
  }
}

/**
 * Notifies all active profiles with a specific role (e.g., regional_coordinator, final_head, procurement_manager, section_manager).
 */
export async function notifyUsersByRole({
  roles,
  requestId,
  title,
  message,
  excludeUserId,
}: {
  roles: Role[];
  requestId: string;
  title: string;
  message: string;
  excludeUserId?: string;
}) {
  try {
    const conditions = [inArray(profiles.role, roles)];
    if (excludeUserId) {
      conditions.push(ne(profiles.id, excludeUserId));
    }

    const targetUsers = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(...conditions));

    if (targetUsers.length === 0) return;

    const entries = targetUsers.map(u => ({
      user_id: u.id,
      request_id: requestId,
      title,
      message,
      is_read: false,
    }));

    await db.insert(notifications).values(entries);
  } catch (err) {
    console.error('[notifyUsersByRole] Error creating notifications:', err);
  }
}

/**
 * Notifies a specific user by their profile ID (e.g. requester or assigned employee).
 */
export async function notifyUser({
  userId,
  requestId,
  title,
  message,
}: {
  userId: string;
  requestId: string;
  title: string;
  message: string;
}) {
  try {
    await db.insert(notifications).values({
      user_id: userId,
      request_id: requestId,
      title,
      message,
      is_read: false,
    });
  } catch (err) {
    console.error('[notifyUser] Error creating notification:', err);
  }
}
