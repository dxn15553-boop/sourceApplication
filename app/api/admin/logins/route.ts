import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { departments, profiles, profileDepartments } from '@/lib/db/schema';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { and, eq, ilike, ne } from 'drizzle-orm';

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

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const password_hash = await bcrypt.hash(cleanPassword, 10);

    if (!deptRequiredRoles.includes(role)) {
      // Global role (no department required)
      const roleLabels: Record<string, string> = {
        final_head: 'Regional Head',
        regional_coordinator: 'Regional Coordinator',
        procurement_manager: 'Procurement Manager',
        section_manager: 'Section Manager',
      };
      const fullName = roleLabels[role] || 'Manager';

      // 1. Demote any other profile currently holding this global manager role so only 1 active manager exists
      await db.update(profiles)
        .set({ role: 'user' })
        .where(eq(profiles.role, role as any));

      // 2. Check if a profile with this email already exists
      const [existingProfile] = await db.select().from(profiles).where(eq(profiles.email, cleanEmail)).limit(1);

      if (existingProfile) {
        // Update existing profile with new manager credentials and role
        await db.update(profiles).set({
          password_hash,
          plaintext_password: cleanPassword,
          full_name: fullName,
          role: role as any,
          created_at: new Date(),
        }).where(eq(profiles.id, existingProfile.id));

        // Clean up any stale department links
        await db.delete(profileDepartments).where(eq(profileDepartments.profile_id, existingProfile.id));
      } else {
        // Create new manager profile
        await db.insert(profiles).values({
          email: cleanEmail,
          password_hash,
          plaintext_password: cleanPassword,
          full_name: fullName,
          role: role as any,
        });
      }

      return NextResponse.json({ success: true }, { status: 201 });
    }

    // Role is HOD or Employee:
    // 1. Find or create the department
    let deptResult = await db.select().from(departments).where(ilike(departments.name, departmentName.trim())).limit(1);
    let deptId = deptResult[0]?.id;

    if (!deptId) {
      const [newDept] = await db.insert(departments).values({
        name: departmentName.trim(),
      }).returning();
      deptId = newDept.id;
    }

    // 2. Unlink any previous HOD / Employee from this department
    const existingDeptProfiles = await db.query.profileDepartments.findMany({
      where: eq(profileDepartments.department_id, deptId),
      with: { profile: true },
    });

    for (const link of existingDeptProfiles) {
      if (role === 'hod' && link.profile.role === 'hod') {
        await db.delete(profileDepartments).where(
          and(
            eq(profileDepartments.department_id, deptId),
            eq(profileDepartments.profile_id, link.profile_id)
          )
        );
      } else if (role === 'employee' && (link.profile.role === 'employee' || link.profile.role === 'user')) {
        await db.delete(profileDepartments).where(
          and(
            eq(profileDepartments.department_id, deptId),
            eq(profileDepartments.profile_id, link.profile_id)
          )
        );
      }
    }

    // 3. Upsert profile with cleanEmail
    const fullName = role === 'hod' ? `HOD (${departmentName.trim()})` : `Source Requester (${departmentName.trim()})`;
    const [existingProfile] = await db.select().from(profiles).where(eq(profiles.email, cleanEmail)).limit(1);

    let profileId: string;
    if (existingProfile) {
      profileId = existingProfile.id;
      await db.update(profiles).set({
        password_hash,
        plaintext_password: cleanPassword,
        full_name: fullName,
        role: role as any,
        created_at: new Date(),
      }).where(eq(profiles.id, profileId));

      // Remove any previous department mappings for this profile
      await db.delete(profileDepartments).where(eq(profileDepartments.profile_id, profileId));
    } else {
      const [newProfile] = await db.insert(profiles).values({
        email: cleanEmail,
        password_hash,
        plaintext_password: cleanPassword,
        full_name: fullName,
        role: role as any,
      }).returning();
      profileId = newProfile.id;
    }

    // 4. Link profile to department
    await db.insert(profileDepartments).values({
      profile_id: profileId,
      department_id: deptId,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating login:', error);
    const errorMessage = error?.message || error?.cause?.message || 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const { profileId, email, password, departmentName, role } = await request.json();

    if (!profileId || !email) {
      return NextResponse.json({ error: 'Profile ID and email are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // 1. Fetch existing profile
    const [existingProfile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    // 2. Check if cleanEmail is already taken by another profile
    const [emailCollision] = await db.select().from(profiles).where(
      and(
        eq(profiles.email, cleanEmail),
        ne(profiles.id, profileId)
      )
    ).limit(1);

    if (emailCollision) {
      return NextResponse.json({ error: 'This email address is already in use by another account.' }, { status: 400 });
    }

    // 3. Prepare update data
    const updateData: any = {
      email: cleanEmail,
    };

    if (password && password.trim()) {
      const cleanPassword = password.trim();
      if (cleanPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
      }
      updateData.password_hash = await bcrypt.hash(cleanPassword, 10);
      updateData.plaintext_password = cleanPassword;
    }

    if (role) {
      updateData.role = role;
    }

    // If departmentName is provided, update department link
    if (departmentName && departmentName.trim()) {
      let deptResult = await db.select().from(departments).where(ilike(departments.name, departmentName.trim())).limit(1);
      let deptId = deptResult[0]?.id;

      if (!deptId) {
        const [newDept] = await db.insert(departments).values({
          name: departmentName.trim(),
        }).returning();
        deptId = newDept.id;
      }

      // Re-link department
      await db.delete(profileDepartments).where(eq(profileDepartments.profile_id, profileId));
      await db.insert(profileDepartments).values({
        profile_id: profileId,
        department_id: deptId,
      });

      if (existingProfile.role === 'hod' || role === 'hod') {
        updateData.full_name = `HOD (${departmentName.trim()})`;
      } else if (existingProfile.role === 'employee' || existingProfile.role === 'user' || role === 'employee') {
        updateData.full_name = `Source Requester (${departmentName.trim()})`;
      }
    }

    await db.update(profiles).set(updateData).where(eq(profiles.id, profileId));

    return NextResponse.json({ success: true, message: 'Login updated successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating login:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
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

    // 1. Fetch profile to check what role it has and what its email is
    const [targetProfile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
    if (!targetProfile) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 2. Unlink from profileDepartments (unassigns from department card immediately)
    await db.delete(profileDepartments).where(eq(profileDepartments.profile_id, profileId));

    // 3. If target profile had a global manager role, demote it so manager cards don't pick it up
    if (['final_head', 'regional_coordinator', 'procurement_manager', 'section_manager'].includes(targetProfile.role)) {
      await db.update(profiles).set({ role: 'user' }).where(eq(profiles.id, profileId));
    }

    // 4. Try to permanently delete the profile from DB
    try {
      await db.delete(profiles).where(eq(profiles.id, profileId));
    } catch (deleteError: any) {
      console.warn('Cannot hard-delete profile due to remaining foreign keys (e.g. requester of live request). Archiving instead:', deleteError?.message);
      // Fallback: Archive the profile so email is freed and it cannot log in
      const archivedEmail = `archived_${Date.now()}_${targetProfile.email}`;
      await db.update(profiles).set({
        email: archivedEmail,
        role: 'user',
        plaintext_password: null,
        full_name: `${targetProfile.full_name} (Archived)`,
      }).where(eq(profiles.id, profileId));
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting login:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
