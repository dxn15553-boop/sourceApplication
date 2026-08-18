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

    if (user.role !== 'employee') {
      return NextResponse.json({ error: 'Only employees can close requests' }, { status: 403 });
    }

    const existingReq = await db.query.sourceRequests.findFirst({
      where: eq(sourceRequests.id, id),
    });

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (existingReq.status !== 'Delivered') {
      return NextResponse.json({ error: 'Request must be in Delivered state to be closed' }, { status: 400 });
    }

    if (existingReq.assigned_employee_id !== user.id) {
      return NextResponse.json({ error: 'Only the assigned employee can close this request' }, { status: 403 });
    }

    const payload = await req.json();
    const { work_completion_date } = payload;

    await db.update(sourceRequests)
      .set({ 
        work_completion_date: work_completion_date ? new Date(work_completion_date) : null,
        status: 'Completed',
        current_assignee_role: null,
        updated_at: new Date()
      })
      .where(eq(sourceRequests.id, id));

    await db.insert(workflowActions).values({
      request_id: id,
      actor_id: user.id,
      action: 'closed',
      comment: `Request formally completed and closed.`,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error closing request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
