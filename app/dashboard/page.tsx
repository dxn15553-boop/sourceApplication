import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import PendingRequestsList from '@/components/dashboard/PendingRequestsList';
import { FilePlus, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests, requiredReviews } from '@/lib/db/schema';
import { eq, desc, and, or, inArray, sql } from 'drizzle-orm';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = session.user as any;

  if (user.role === 'admin') {
    redirect('/admin/hod-logins');
  }

  const activeDepartmentId = user.departmentIds?.[0] || null;

  const conditions = [];

  switch (user.role) {
    case 'user':
      if (activeDepartmentId) {
        conditions.push(eq(sourceRequests.department_id, activeDepartmentId));
      } else {
        conditions.push(eq(sourceRequests.id, 'none')); // id is text, this is safe
      }
      break;

    case 'hod':
      if (activeDepartmentId) {
        const pendingReviews = await db.query.requiredReviews.findMany({
          where: and(
            eq(requiredReviews.department_id, activeDepartmentId),
            eq(requiredReviews.status, 'Pending')
          ),
          columns: { request_id: true }
        });
        const reviewReqIds = pendingReviews.map((r: any) => r.request_id);

        conditions.push(
          or(
            // Home HOD pending actions
            and(
              eq(sourceRequests.requester_department_id, activeDepartmentId),
              inArray(sourceRequests.status, ['Submitted', 'Returned to HOD', 'Pending Home HOD Confirmation'])
            ),
            // Target HOD pending actions
            and(
              eq(sourceRequests.department_id, activeDepartmentId),
              eq(sourceRequests.status, 'Under Required Review')
            ),
            // Explicit pending reviews
            reviewReqIds.length > 0 ? inArray(sourceRequests.id, reviewReqIds) : sql`false`
          )
        );
      } else {
        conditions.push(eq(sourceRequests.id, 'none'));
      }
      break;
    case 'regional_coordinator':
      conditions.push(eq(sourceRequests.current_assignee_role, 'regional_coordinator'));
      break;
    case 'final_head':
      // Final head sees things where role is final_head, OR where status is Under Required Review and all reviews are approved
      // To simplify, we rely on the fact that if a request is Under Required Review and all are approved, it should be in their view.
      // But we can't easily query that in Drizzle without complex joins. Instead, we can fetch them.
      // Actually, when the last review is approved, we could change current_assignee_role to 'final_head'. Let's do that in the API route later.
      conditions.push(eq(sourceRequests.current_assignee_role, 'final_head'));
      break;
    case 'procurement_manager':
      conditions.push(eq(sourceRequests.current_assignee_role, 'procurement_manager'));
      break;
    case 'section_manager':
      conditions.push(eq(sourceRequests.current_assignee_role, 'section_manager'));
      break;
    case 'employee':
      conditions.push(
        and(
          eq(sourceRequests.assigned_employee_id, user.id),
          inArray(sourceRequests.status, ['Assigned', 'Vendor Evaluation', 'PR Created', 'PO Created', 'Payment Pending', 'Delivered'])
        )
      );
      break;
    case 'admin':
      break;
  }

  const pendingRequests = await db.query.sourceRequests.findMany({
    where: conditions.length > 0 ? or(...conditions) : undefined,
    with: {
      department: { columns: { id: true, name: true } },
      requester: { columns: { id: true, full_name: true } },
    },
    orderBy: [desc(sourceRequests.created_at)],
    limit: 5,
  });

  // Stats query
  const statsConditions = [];
  if (user.role === 'user') {
    if (activeDepartmentId) statsConditions.push(eq(sourceRequests.department_id, activeDepartmentId));
    else statsConditions.push(eq(sourceRequests.id, 'none'));
  }

  if (user.role === 'hod') {
    if (activeDepartmentId) statsConditions.push(eq(sourceRequests.department_id, activeDepartmentId));
    else statsConditions.push(eq(sourceRequests.id, 'none'));
  }

  const allRequests = await db.query.sourceRequests.findMany({
    where: statsConditions.length > 0 ? and(...statsConditions) : undefined,
    columns: { status: true },
  });

  const total = allRequests.length;
  const pending = allRequests.filter((r: any) => !['Completed', 'HOD Rejected', 'Final Head Rejected', 'Procurement Rejected', 'Cancelled'].includes(r.status)).length;
  const completed = allRequests.filter((r: any) => r.status === 'Completed').length;
  const rejected = allRequests.filter((r: any) => r.status.includes('Rejected')).length;

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <AppShell
      pageTitle="Dashboard"
      pageSubtitle={`${greeting}, ${user.name.split(' ')[0]}!`}
      headerAction={
        user.role === 'user' ? (
          <Link href="/requests/new" className="btn btn-primary btn-sm">
            <FilePlus size={15} />
            New Request
          </Link>
        ) : null
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 28 }} className="stagger">
        <StatCard icon={<FilePlus size={20} />} value={total} label="Total Requests" color="#3b82f6" />
        <StatCard icon={<Clock size={20} />} value={pending} label="In Progress" color="#f59e0b" />
        <StatCard icon={<CheckCircle2 size={20} />} value={completed} label="Completed" color="#10b981" />
        <StatCard icon={<AlertCircle size={20} />} value={rejected} label="Rejected" color="#ef4444" />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Pending Your Action</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Requests waiting for your review</p>
          </div>
          <Link href="/requests" className="btn btn-ghost btn-sm">
            View All <ChevronRight size={14} />
          </Link>
        </div>

        <PendingRequestsList pendingRequests={pendingRequests} userId={user.id} />
      </div>
    </AppShell>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="stat-card animate-fade-in">
      <div className="stat-icon" style={{ background: `${color}18` }}><span style={{ color }}>{icon}</span></div>
      <div><div className="stat-value" style={{ color }}>{value}</div><div className="stat-label">{label}</div></div>
    </div>
  );
}
