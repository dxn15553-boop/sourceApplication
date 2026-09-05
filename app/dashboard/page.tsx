import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/requests/StatusBadge';
import { FilePlus, Clock, CheckCircle2, AlertCircle, ArrowRight, ChevronRight, FileText } from 'lucide-react';
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }} className="stagger">
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

        {!pendingRequests.length ? (
          <div className="empty-state">
            <CheckCircle2 size={40} style={{ color: 'var(--success)', opacity: 0.6 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>All caught up!</p>
            <p style={{ fontSize: 13 }}>No requests are waiting for your action.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="stagger">
            {pendingRequests.map((req: any) => (
              <Link
                key={req.id}
                href={`/requests/${req.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                className="animate-fade-in"
              >
                <span className="src-id">{req.id}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {req.description}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {req.priority && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 6,
                          background:
                            ['URGENT', 'Urgent'].includes(req.priority)
                              ? 'rgba(239,68,68,0.12)'
                              : ['HIGH', 'High'].includes(req.priority)
                              ? 'rgba(245,158,11,0.12)'
                              : ['NORMAL', 'Normal', 'LOW', 'Low'].includes(req.priority)
                              ? 'rgba(16,185,129,0.12)'
                              : 'rgba(59,130,246,0.12)',
                          color:
                            ['URGENT', 'Urgent'].includes(req.priority)
                              ? 'var(--danger)'
                              : ['HIGH', 'High'].includes(req.priority)
                              ? 'var(--warning)'
                              : ['NORMAL', 'Normal', 'LOW', 'Low'].includes(req.priority)
                              ? 'var(--success)'
                              : 'var(--info)',
                        }}
                      >
                        {['URGENT', 'Urgent'].includes(req.priority) && '🔴 '}
                        {['HIGH', 'High'].includes(req.priority) && '🟠 '}
                        {['IMPORTANT', 'Important', 'MEDIUM', 'Medium'].includes(req.priority) && '🔵 '}
                        {['NORMAL', 'Normal', 'LOW', 'Low'].includes(req.priority) && '🟢 '}
                        {req.priority}
                      </span>
                    )}
                    <span>{req.department?.name}</span>
                    <span>·</span>
                    <span>{new Date(req.created_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </p>
                </div>
                {req.srf_number && (
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(`/requests/${req.id}/srf?download=1`, '_blank');
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#0284c7',
                      background: 'rgba(2, 132, 199, 0.12)',
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid rgba(2, 132, 199, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                    title="Download Official SRF PDF"
                  >
                    <FileText size={12} />
                    <span>{req.srf_number} PDF 📥</span>
                  </span>
                )}
                <StatusBadge status={req.status as any} animate />
                <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        )}
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
