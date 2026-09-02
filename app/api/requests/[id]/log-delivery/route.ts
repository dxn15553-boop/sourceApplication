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
      return NextResponse.json({ error: 'Only employees can log deliveries' }, { status: 403 });
    }

    const existingReq = await db.query.sourceRequests.findFirst({
      where: eq(sourceRequests.id, id),
    });

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (existingReq.status !== 'Payment Pending') {
      return NextResponse.json({ error: 'Request must be in Payment Pending state to log delivery' }, { status: 400 });
    }

    if (existingReq.assigned_employee_id !== user.id) {
      return NextResponse.json({ error: 'Only the assigned employee can log deliveries for this request' }, { status: 403 });
    }

    const payload = await req.json();
    const { 
      ordered_qty, 
      received_qty,
      accepted_qty, 
      rejected_qty, 
      qc_status,
      rejection_reason,
      qc_remarks,
      promised_delivery_date,
      material_dispatch_date,
      material_received_date
    } = payload;

    if (ordered_qty === undefined || accepted_qty === undefined || rejected_qty === undefined) {
      return NextResponse.json({ error: 'Ordered, Accepted, and Rejected quantities are required' }, { status: 400 });
    }

    if (Number(rejected_qty) > 0 && (!rejection_reason || !rejection_reason.trim())) {
      return NextResponse.json({ error: 'Rejection reason is required if rejected quantity > 0' }, { status: 400 });
    }

    let onTime: boolean | null = null;
    if (promised_delivery_date && material_received_date) {
      onTime = new Date(material_received_date) <= new Date(promised_delivery_date);
    }

    const calculatedReceived = received_qty !== undefined ? Number(received_qty) : (Number(accepted_qty) + Number(rejected_qty));

    await db.update(sourceRequests)
      .set({ 
        ordered_qty: Number(ordered_qty),
        received_qty: calculatedReceived,
        accepted_qty: Number(accepted_qty),
        rejected_qty: Number(rejected_qty),
        rejection_reason: rejection_reason || null,
        qc_status: qc_status || 'Passed',
        on_time_delivery: onTime,
        qc_remarks: qc_remarks || null,
        promised_delivery_date: promised_delivery_date ? new Date(promised_delivery_date) : null,
        material_dispatch_date: material_dispatch_date ? new Date(material_dispatch_date) : null,
        material_received_date: material_received_date ? new Date(material_received_date) : null,
        status: 'Delivered',
        updated_at: new Date()
      })
      .where(eq(sourceRequests.id, id));

    const qcSummary = qc_status ? ` [QC: ${qc_status}]` : '';
    const onTimeSummary = onTime !== null ? (onTime ? ' (On-Time)' : ' (Delayed)') : '';

    await db.insert(workflowActions).values({
      request_id: id,
      actor_id: user.id,
      action: 'delivered',
      comment: `Delivery & QC logged: ${accepted_qty} accepted, ${rejected_qty} rejected${qcSummary}${onTimeSummary}.${qc_remarks ? ` Notes: ${qc_remarks}` : ''}`,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error logging delivery:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
