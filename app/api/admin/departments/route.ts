import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { departments } from '@/lib/db/schema';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const { name } = await request.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    await db.insert(departments).values({
      name: name.trim(),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating department:', error);
    if (error.code === '23505') { // Postgres unique violation
      return NextResponse.json({ error: 'A department with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
