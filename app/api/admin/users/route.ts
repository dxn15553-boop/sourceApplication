import { auth } from '@/auth';
import { db } from '@/lib/db';
import { profiles, profileDepartments } from '@/lib/db/schema';
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
    const { email, password, full_name, role, departmentIds } = body;

    if (!email || !password || !full_name || !role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [newProfile] = await db.insert(profiles).values({
      email,
      password_hash,
      plaintext_password: password,
      full_name,
      role,
    }).returning();

    if (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0) {
      const mappings = departmentIds.map((deptId: string) => ({
        profile_id: newProfile.id,
        department_id: deptId,
      }));
      await db.insert(profileDepartments).values(mappings);
    }

    return Response.json({ success: true, user_id: newProfile.id }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505' || (err.message && err.message.includes('duplicate key'))) { // unique violation
      return Response.json({ error: 'Email already exists' }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user as any;

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, email, password, full_name, role, departmentIds } = body;

    if (!id || !email || !full_name || !role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { eq } = await import('drizzle-orm');

    const updateData: any = { email, full_name, role };
    if (password && password.trim()) {
      updateData.password_hash = await bcrypt.hash(password, 10);
      updateData.plaintext_password = password;
    }

    await db.update(profiles)
      .set(updateData)
      .where(eq(profiles.id, id));

    // Update departments: delete old and insert new
    await db.delete(profileDepartments).where(eq(profileDepartments.profile_id, id));

    if (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0) {
      const mappings = departmentIds.map((deptId: string) => ({
        profile_id: id,
        department_id: deptId,
      }));
      await db.insert(profileDepartments).values(mappings);
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505' || (err.message && err.message.includes('duplicate key'))) {
      return Response.json({ error: 'Email already exists' }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user as any;

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Prevent deleting yourself
    if (id === user.id) {
      return Response.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const { eq } = await import('drizzle-orm');

    // First delete profileDepartments due to foreign key (if no cascade)
    await db.delete(profileDepartments).where(eq(profileDepartments.profile_id, id));
    
    // Then delete the profile
    await db.delete(profiles).where(eq(profiles.id, id));

    return Response.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
