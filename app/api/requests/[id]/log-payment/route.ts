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
      return NextResponse.json({ error: 'Only employees can log payments' }, { status: 403 });
    }

    const existingReq = await db.query.sourceRequests.findFirst({
      where: eq(sourceRequests.id, id),
    });

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (existingReq.status !== 'PO Created') {
      return NextResponse.json({ error: 'Request must be in PO Created state to log payment' }, { status: 400 });
    }

    if (existingReq.assigned_employee_id !== user.id) {
      return NextResponse.json({ error: 'Only the assigned employee can log payments for this request' }, { status: 403 });
    }

    const payload = await req.json();
    const { prl_completed, payment_done_date } = payload;

    if (prl_completed === undefined || !payment_done_date) {
      return NextResponse.json({ error: 'PRL completion status and Payment Done Date are required' }, { status: 400 });
    }

    await db.update(sourceRequests)
      .set({ 
        prl_completed: Boolean(prl_completed),
        payment_done_date: new Date(payment_done_date),
        status: 'Payment Pending',
        updated_at: new Date()
      })
      .where(eq(sourceRequests.id, id));

    await db.insert(workflowActions).values({
      request_id: id,
      actor_id: user.id,
      action: 'payment_done',
      comment: `Payment details logged (Date: ${payment_done_date})`,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error logging payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
