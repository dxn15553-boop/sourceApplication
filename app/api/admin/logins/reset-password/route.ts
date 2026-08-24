import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const { profileId, newPassword } = await request.json();
    if (!profileId || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Valid profile ID and password (min 8 chars) are required.' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    
    await db.update(profiles)
      .set({ password_hash, plaintext_password: newPassword })
      .where(eq(profiles.id, profileId));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
