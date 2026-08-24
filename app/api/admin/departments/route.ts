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

    const { name, empEmail, empPassword, hodEmail, hodPassword } = await request.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    // Use a transaction to ensure department and both users are created together
    await db.transaction(async (tx) => {
      // 1. Create department
      const [newDept] = await tx.insert(departments).values({
        name: name.trim(),
      }).returning();

      // 2. Create Employee Profile
      if (empEmail && empPassword) {
        const empPasswordHash = await bcrypt.hash(empPassword, 10);
        const [empProfile] = await tx.insert(profiles).values({
          email: empEmail.trim(),
          password_hash: empPasswordHash,
          full_name: `Employee (${name.trim()})`,
          role: 'user', // Employee is 'user' role by default in source app
        }).returning();

        await tx.insert(profileDepartments).values({
          profile_id: empProfile.id,
          department_id: newDept.id,
        });
      }

      // 3. Create HOD Profile
      if (hodEmail && hodPassword) {
        const hodPasswordHash = await bcrypt.hash(hodPassword, 10);
        const [hodProfile] = await tx.insert(profiles).values({
          email: hodEmail.trim(),
          password_hash: hodPasswordHash,
          full_name: `HOD (${name.trim()})`,
          role: 'hod',
        }).returning();

        await tx.insert(profileDepartments).values({
          profile_id: hodProfile.id,
          department_id: newDept.id,
        });
      }
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating department:', error);
    if (error.code === '23505' || (error.message && error.message.includes('duplicate key'))) { 
      if (error.message.includes('profiles_email_unique')) {
         return NextResponse.json({ error: 'An account with one of these emails already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'A department with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    const { eq } = await import('drizzle-orm');
    
    // In this simpler setup, deleting a department should also delete its assigned profiles to prevent orphaned logins.
    // First, find all profiles assigned to this department
    const mappings = await db.query.profileDepartments.findMany({
      where: eq(profileDepartments.department_id, id)
    });
    const profileIds = mappings.map(m => m.profile_id);

    // Delete mappings
    await db.delete(profileDepartments).where(eq(profileDepartments.department_id, id));
    
    // Delete the department
    await db.delete(departments).where(eq(departments.id, id));

    // Delete the profiles if there are any
    if (profileIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      await db.delete(profiles).where(inArray(profiles.id, profileIds));
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
