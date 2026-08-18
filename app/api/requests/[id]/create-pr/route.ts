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
      return NextResponse.json({ error: 'Only employees can create PRs' }, { status: 403 });
    }

    const existingReq = await db.query.sourceRequests.findFirst({
      where: eq(sourceRequests.id, id),
    });

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (existingReq.status !== 'Vendor Evaluation') {
      return NextResponse.json({ error: 'Request must be in Vendor Evaluation to create PR' }, { status: 400 });
    }

    if (existingReq.assigned_employee_id !== user.id) {
      return NextResponse.json({ error: 'Only the assigned employee can create a PR for this request' }, { status: 403 });
    }

    const payload = await req.json();
    const { pr_number, pr_date } = payload;

    if (!pr_number || !pr_date) {
      return NextResponse.json({ error: 'PR Number and PR Date are required' }, { status: 400 });
    }

    // Update main request status
    await db.update(sourceRequests)
      .set({ 
        pr_number,
        pr_date: new Date(pr_date),
        status: 'PR Created',
        updated_at: new Date()
      })
      .where(eq(sourceRequests.id, id));

    // Log action
    await db.insert(workflowActions).values({
      request_id: id,
      actor_id: user.id,
      action: 'pr_created',
      comment: `Purchase Requisition created (PR Number: ${pr_number})`,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error creating PR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
