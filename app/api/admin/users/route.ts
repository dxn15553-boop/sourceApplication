import { auth } from '@/auth';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user as any;

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, full_name, role, department_id } = body;

    if (!email || !password || !full_name || !role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [newProfile] = await db.insert(profiles).values({
      email,
      password_hash,
      full_name,
      role,
      department_id: department_id || null,
    }).returning();

    return Response.json({ success: true, user_id: newProfile.id }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') { // unique violation
      return Response.json({ error: 'Email already exists' }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
