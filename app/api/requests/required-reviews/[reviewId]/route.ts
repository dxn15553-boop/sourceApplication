import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { requiredReviews, sourceRequests, workflowActions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, remarks, attachment_path, attachment_name } = await req.json();
    if (!['Approved', 'Returned', 'Rejected'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const user = session.user as any;

    const review = await db.query.requiredReviews.findFirst({
      where: eq(requiredReviews.id, reviewId),
      with: { department: true }
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.status !== 'Pending') {
      return NextResponse.json({ error: 'Review already submitted' }, { status: 400 });
    }

    // Must be HOD of that department
    if (user.role !== 'hod' || !user.departmentIds?.includes(review.department_id)) {
      return NextResponse.json({ error: 'Unauthorized to submit this review' }, { status: 403 });
    }

    // Update review
    await db.update(requiredReviews)
      .set({
        status: action as any,
        remarks: remarks || null,
        reviewer_id: user.id,
        reviewed_at: new Date(),
        attachment_path: attachment_path || null,
        attachment_name: attachment_name || null,
      })
      .where(eq(requiredReviews.id, reviewId));

    // Log action on main request
    await db.insert(workflowActions).values({
      request_id: review.request_id,
      actor_id: user.id,
      action: action === 'Approved' ? 'approved' : 'returned',
      comment: `${review.department.name} User Department Review ${action}${remarks ? ': ' + remarks : ''}${attachment_name ? ' (Attachment: ' + attachment_name + ')' : ''}`,
    });

    // If returned (or rejected), return to Home HOD
    if (action === 'Returned' || action === 'Rejected') {
      await db.update(sourceRequests)
        .set({ 
          status: 'Returned to HOD', // Return to Home HOD
          current_assignee_role: 'hod',
          updated_at: new Date()
        })
        .where(eq(sourceRequests.id, review.request_id));
        
      await db.insert(workflowActions).values({
        request_id: review.request_id,
        actor_id: user.id,
        action: 'returned',
        comment: `Request returned by ${review.department.name} User Department${remarks ? ': ' + remarks : ''}`,
      });
    } else {
      // Check if all reviews are now approved (only considering the latest review per department)
      const allReviews = await db.query.requiredReviews.findMany({
        where: eq(requiredReviews.request_id, review.request_id)
      });
      
      const latestMap: Record<string, any> = {};
      allReviews.forEach((r: any) => {
        const existing = latestMap[r.department_id];
        if (!existing || new Date(r.created_at) > new Date(existing.created_at)) {
          latestMap[r.department_id] = r;
        }
      });
      
      const latestReviews = Object.values(latestMap);
      const allApproved = latestReviews.every((r: any) => 
        (r.id === reviewId ? 'Approved' : r.status) === 'Approved'
      );
 
      if (allApproved) {
        await db.update(sourceRequests)
          .set({ 
            status: 'Pending Home HOD Confirmation',
            current_assignee_role: 'hod',
            updated_at: new Date()
          })
          .where(eq(sourceRequests.id, review.request_id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
