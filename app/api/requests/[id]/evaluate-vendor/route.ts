import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests, vendorEvaluations, workflowActions } from '@/lib/db/schema';
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
      return NextResponse.json({ error: 'Only employees can evaluate vendors' }, { status: 403 });
    }

    const existingReq = await db.query.sourceRequests.findFirst({
      where: eq(sourceRequests.id, id),
    });

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (existingReq.status !== 'Assigned') {
      return NextResponse.json({ error: 'Request must be Assigned to evaluate vendors' }, { status: 400 });
    }

    if (existingReq.assigned_employee_id !== user.id) {
      return NextResponse.json({ error: 'Only the assigned employee can evaluate vendors for this request' }, { status: 403 });
    }

    const payload = await req.json();
    const { 
      l1_vendor, l1_price, 
      l2_vendor, l2_price, 
      l3_vendor, l3_price, 
      selected_vendor, selection_reason 
    } = payload;

    if (!l1_vendor || l1_price === undefined || l1_price === null) {
      return NextResponse.json({ error: 'L1 Vendor and Price are required' }, { status: 400 });
    }

    if (!['L1', 'L2', 'L3'].includes(selected_vendor)) {
      return NextResponse.json({ error: 'A valid vendor selection (L1, L2, L3) is required' }, { status: 400 });
    }

    if (selected_vendor !== 'L1' && (!selection_reason || !selection_reason.trim())) {
      return NextResponse.json({ error: 'Reason for selection is required when not selecting L1' }, { status: 400 });
    }

    if (selected_vendor === 'L2' && (!l2_vendor || l2_price === undefined || l2_price === null)) {
      return NextResponse.json({ error: 'L2 Vendor details are required if L2 is selected' }, { status: 400 });
    }

    if (selected_vendor === 'L3' && (!l3_vendor || l3_price === undefined || l3_price === null)) {
      return NextResponse.json({ error: 'L3 Vendor details are required if L3 is selected' }, { status: 400 });
    }

    // Insert evaluation
    await db.insert(vendorEvaluations).values({
      request_id: id,
      l1_vendor,
      l1_price: Number(l1_price),
      l2_vendor: l2_vendor || null,
      l2_price: l2_price ? Number(l2_price) : null,
      l3_vendor: l3_vendor || null,
      l3_price: l3_price ? Number(l3_price) : null,
      selected_vendor,
      selection_reason: selection_reason || null,
      selected_by: user.id,
    });

    // Update main request status
    await db.update(sourceRequests)
      .set({ 
        status: 'Vendor Evaluation',
        updated_at: new Date()
      })
      .where(eq(sourceRequests.id, id));

    // Log action
    const selectedName = selected_vendor === 'L1' ? l1_vendor : selected_vendor === 'L2' ? l2_vendor : l3_vendor;
    await db.insert(workflowActions).values({
      request_id: id,
      actor_id: user.id,
      action: 'vendor_selected',
      comment: `Evaluated vendors and selected ${selected_vendor} (${selectedName})`,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in vendor evaluation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
