import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests, requiredReviews, workflowActions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { departmentIds } = await req.json();
    if (!departmentIds || !Array.isArray(departmentIds) || departmentIds.length === 0) {
      return NextResponse.json({ error: 'No departments selected' }, { status: 400 });
    }

    const user = session.user as any;
    
    // Verify request
    const existingReq = await db.query.sourceRequests.findFirst({
      where: eq(sourceRequests.id, id),
    });

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    if (existingReq.status !== 'HOD Approved') {
      return NextResponse.json({ error: 'Invalid request status for assigning reviews' }, { status: 400 });
    }

    if (existingReq.requester_id !== user.id) {
      return NextResponse.json({ error: 'Only the creator can assign required reviews' }, { status: 403 });
    }

    // Insert required reviews
    const reviewsToInsert = departmentIds.map((deptId: string) => ({
      request_id: id,
      department_id: deptId,
      status: 'Pending' as const,
    }));
    
    await db.insert(requiredReviews).values(reviewsToInsert);

    // Update status to Under Required Review
    await db.update(sourceRequests)
      .set({ 
        status: 'Under Required Review',
        updated_at: new Date()
      })
      .where(eq(sourceRequests.id, id));

    // Log workflow action
    await db.insert(workflowActions).values({
      request_id: id,
      actor_id: user.id,
      action: 'submitted', // Or a custom one, 'submitted' is fine
      comment: `Assigned for required review to ${departmentIds.length} department(s)`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error creating required reviews:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
