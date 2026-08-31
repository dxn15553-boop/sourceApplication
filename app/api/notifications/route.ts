import { auth } from '@/auth';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as any;

    const data = await db.query.notifications.findMany({
      where: eq(notifications.user_id, user.id),
      orderBy: [desc(notifications.created_at)],
    });

    return Response.json({ data });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as any;

    const body = await request.json().catch(() => ({}));
    const { id } = body;

    if (id) {
      await db.update(notifications)
        .set({ is_read: true })
        .where(and(eq(notifications.id, id), eq(notifications.user_id, user.id)));
    } else {
      await db.update(notifications)
        .set({ is_read: true })
        .where(eq(notifications.user_id, user.id));
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Error marking notifications read:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
