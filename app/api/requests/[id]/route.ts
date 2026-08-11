import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: Request,
  ctx: RouteContext<'/api/requests/[id]'>
) {
  try {
    const { id } = await ctx.params;
    const session = await auth();
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await db.query.sourceRequests.findFirst({
      where: eq(sourceRequests.id, id),
      with: {
        requester: {
          columns: { id: true, full_name: true, role: true },
          with: { department: { columns: { id: true, name: true } } }
        },
        department: { columns: { id: true, name: true } },
        assigned_employee: { columns: { id: true, full_name: true, role: true } },
        workflow_actions: {
          columns: { id: true, action: true, comment: true, created_at: true },
          with: { actor: { columns: { id: true, full_name: true, role: true } } },
          orderBy: (actions: any, { asc }: any) => [asc(actions.created_at)],
        }
      }
    });

    if (!data) return Response.json({ error: 'Request not found' }, { status: 404 });

    return Response.json({ data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
