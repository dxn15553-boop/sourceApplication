import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { departments, profiles, profileDepartments } from '@/lib/db/schema';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const { name, hodName, hodEmail, hodPassword } = await request.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    // Use a transaction to ensure both department and user are created together
    await db.transaction(async (tx) => {
      // 1. Create department
      const [newDept] = await tx.insert(departments).values({
        name: name.trim(),
      }).returning();

      // 2. If HOD details are provided, create the HOD user and assign them
      if (hodName && hodEmail && hodPassword) {
        const password_hash = await bcrypt.hash(hodPassword, 10);
        
        const [newProfile] = await tx.insert(profiles).values({
          email: hodEmail.trim(),
          password_hash,
          full_name: hodName.trim(),
          role: 'hod',
        }).returning();

        await tx.insert(profileDepartments).values({
          profile_id: newProfile.id,
          department_id: newDept.id,
        });
      }
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating department:', error);
    if (error.code === '23505' || (error.message && error.message.includes('duplicate key'))) { // Postgres unique violation
      if (error.message.includes('profiles_email_unique')) {
         return NextResponse.json({ error: 'A user with this HOD email already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'A department with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const { id, name } = await request.json();
    if (!id || !name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Department ID and name are required' }, { status: 400 });
    }

    const { eq } = await import('drizzle-orm');
    await db.update(departments).set({ name: name.trim() }).where(eq(departments.id, id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating department:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    const { eq } = await import('drizzle-orm');
    
    // Delete profile mappings first
    await db.delete(profileDepartments).where(eq(profileDepartments.department_id, id));
    // Then delete the department
    await db.delete(departments).where(eq(departments.id, id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
