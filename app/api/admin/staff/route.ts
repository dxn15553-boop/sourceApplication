import { auth } from '@/auth';
import { db } from '@/lib/db';
import { staff } from '@/lib/db/schema';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { full_name, department_id, is_hod } = body;

    if (!full_name || !department_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newStaff = await db.insert(staff).values({
      full_name,
      department_id,
      is_hod: !!is_hod,
    }).returning();

    return Response.json({ success: true, data: newStaff[0] });
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
