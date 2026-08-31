import { db } from '@/lib/db';
import { requiredReviews, sourceRequests, profileDepartments, profiles, notifications } from '@/lib/db/schema';
import { eq, and, lt } from 'drizzle-orm';

export async function GET() {
  try {
    // 48 hours ago
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Find required reviews pending for more than 48 hours
    const pendingReviews = await db.query.requiredReviews.findMany({
      where: and(
        eq(requiredReviews.status, 'Pending'),
        lt(requiredReviews.created_at, fortyEightHoursAgo)
      ),
      with: {
        department: true,
        request: true,
      }
    });

    let notificationsCreated = 0;

    for (const review of pendingReviews) {
      const reqId = review.request_id;
      const requesterDeptId = review.request.requester_department_id;
      if (!requesterDeptId) continue;

      // Find HOD profiles for the requester's department
      const homeHods = await db.select({
        hodId: profiles.id
      })
      .from(profiles)
      .innerJoin(profileDepartments, eq(profileDepartments.profile_id, profiles.id))
      .where(and(
        eq(profiles.role, 'hod'),
        eq(profileDepartments.department_id, requesterDeptId)
      ));

      for (const hod of homeHods) {
        // Prevent duplicate alerts: check if a delayed review alert was already created for this request, target dept and HOD
        const existing = await db.query.notifications.findFirst({
          where: and(
            eq(notifications.user_id, hod.hodId),
            eq(notifications.request_id, reqId),
            eq(notifications.title, 'Pending Approval Alert')
          )
        });

        if (!existing) {
          await db.insert(notifications).values({
            user_id: hod.hodId,
            request_id: reqId,
            title: 'Pending Approval Alert',
            message: `Request ${reqId} has been pending for approval in target department "${review.department.name}" for more than 48 hours.`,
          });
          notificationsCreated++;
        }
      }
    }

    return Response.json({ success: true, notificationsCreated });
  } catch (err: any) {
    console.error('Cron check pending reviews error:', err);
    return Response.json({ error: 'Internal server error', message: err.message }, { status: 500 });
  }
}
