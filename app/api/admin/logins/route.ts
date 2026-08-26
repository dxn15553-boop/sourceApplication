import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { departments, profiles, profileDepartments } from '@/lib/db/schema';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { eq, ilike } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const { departmentName, email, password, role } = await request.json();
    const deptRequiredRoles = ['hod', 'user', 'employee'];
    const validRoles = ['hod', 'user', 'employee', 'final_head', 'regional_coordinator', 'procurement_manager', 'section_manager'];

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Email, password, and role are required.' }, { status: 400 });
    }

    if (deptRequiredRoles.includes(role) && !departmentName) {
      return NextResponse.json({ error: 'Department is required for HOD / Employee roles.' }, { status: 400 });
    }

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    if (deptRequiredRoles.includes(role)) {
      // 1. Find or create the department
      let deptResult = await db.select().from(departments).where(ilike(departments.name, departmentName.trim())).limit(1);
      let deptId = deptResult[0]?.id;

      if (!deptId) {
        const [newDept] = await db.insert(departments).values({
          name: departmentName.trim(),
        }).returning();
        deptId = newDept.id;
      }

      // 2. Create profile
      const fullName = role === 'hod' ? `HOD (${departmentName.trim()})` : `Employee (${departmentName.trim()})`;

      const [newProfile] = await db.insert(profiles).values({
        email: email.trim(),
        password_hash,
        plaintext_password: password,
        full_name: fullName,
        role: role,
      }).returning();

      // 3. Link profile to department
      await db.insert(profileDepartments).values({
        profile_id: newProfile.id,
        department_id: deptId,
      });
    } else {
      // Global role (no department required)
      const roleLabels: Record<string, string> = {
        final_head: 'Regional Head',
        regional_coordinator: 'Regional Coordinator',
        procurement_manager: 'Procurement Manager',
        section_manager: 'Section Manager',
      };
      const fullName = roleLabels[role] || 'Manager';

      await db.insert(profiles).values({
        email: email.trim(),
        password_hash,
        plaintext_password: password,
        full_name: fullName,
        role: role,
      });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating login:', error);
    const errorCode = error?.code || error?.cause?.code;
    const errorMessage = error?.message || error?.cause?.message || '';

    if (errorCode === '23505' || errorMessage.includes('duplicate key')) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: errorMessage || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const { profileId } = await request.json();
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    const { eq } = await import('drizzle-orm');
    
    // Delete mappings
    await db.delete(profileDepartments).where(eq(profileDepartments.profile_id, profileId));
    
    // Delete profile
    await db.delete(profiles).where(eq(profiles.id, profileId));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting login:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
