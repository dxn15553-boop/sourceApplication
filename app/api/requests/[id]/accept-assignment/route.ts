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

    const existingReq = await db.query.sourceRequests.findFirst({
      where: eq(sourceRequests.id, id),
    });

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (existingReq.status !== 'Assigned') {
      return NextResponse.json({ error: 'Request must be in Assigned status to accept' }, { status: 400 });
    }

    // Allow the assigned employee, or section manager / admin to accept
    const isAssigned = existingReq.assigned_employee_id === user.id;
    const isAuthorized = isAssigned || user.role === 'admin' || user.role === 'section_manager';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Only the assigned handler can accept this assignment' }, { status: 403 });
    }

    const now = new Date();

    await db.update(sourceRequests)
      .set({
        handler_accepted_at: now,
        status: 'Vendor Evaluation',
        updated_at: now,
      })
      .where(eq(sourceRequests.id, id));

    await db.insert(workflowActions).values({
      request_id: id,
      actor_id: user.id,
      action: 'processing_started',
      comment: `Handler ${user.name || 'Employee'} accepted assignment and started vendor evaluation.`,
    });

    return NextResponse.json({ success: true, message: 'Assignment accepted' });
  } catch (error: any) {
    console.error('Error accepting assignment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
