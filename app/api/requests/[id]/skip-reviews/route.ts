import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests, workflowActions } from '@/lib/db/schema';
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

    const user = session.user as any;
    
    // Verify request
    const existingReq = await db.query.sourceRequests.findFirst({
      where: eq(sourceRequests.id, id),
    });

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    if (existingReq.status !== 'HOD Approved') {
      return NextResponse.json({ error: 'Invalid request status for skipping reviews' }, { status: 400 });
    }

    if (existingReq.requester_id !== user.id) {
      return NextResponse.json({ error: 'Only the creator can skip required reviews' }, { status: 403 });
    }

    // Update status to Final Head Review
    await db.update(sourceRequests)
      .set({ 
        status: 'Final Head Review',
        current_assignee_role: 'final_head',
        updated_at: new Date()
      })
      .where(eq(sourceRequests.id, id));

    // Log workflow action
    await db.insert(workflowActions).values({
      request_id: id,
      actor_id: user.id,
      action: 'submitted', 
      comment: 'Skipped cross-functional reviews. Sent directly to Regional Head of Factories.',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error skipping required reviews:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
