import { redirect, notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/requests/StatusBadge';
import WorkflowTimeline from '@/components/requests/WorkflowTimeline';
import ApprovalPanel from '@/components/requests/ApprovalPanel';
import AssignmentPanel from '@/components/requests/AssignmentPanel';
import ResubmitPanel from '@/components/requests/ResubmitPanel';
import CompletePanel from '@/components/requests/CompletePanel';
import { ArrowLeft, Download, Paperclip, User, Building2, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import type { SourceRequest } from '@/lib/types';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests, profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Request ${id}` };
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = session.user as any;
  const profile = { id: user.id, role: user.role, department_id: user.department_id, full_name: user.name };

  const reqData = await db.query.sourceRequests.findFirst({
    where: eq(sourceRequests.id, id),
    with: {
      requester: { columns: { id: true, full_name: true, role: true } },
      department: { columns: { id: true, name: true } },
      assigned_employee: { columns: { id: true, full_name: true, role: true } },
      workflow_actions: {
        columns: { id: true, action: true, comment: true, created_at: true },
        with: { actor: { columns: { id: true, full_name: true, role: true } } },
        orderBy: (actions: any, { asc }: any) => [asc(actions.created_at)],
      }
    }
  });

  if (!reqData) notFound();

  const req = reqData as unknown as SourceRequest & {
    requester: { id: string; full_name: string; role: string };
    department: { id: string; name: string };
    assigned_employee?: { id: string; full_name: string; role: string };
  };

  const isRequester = req.requester_id === user.id;
  const isHodOfDept = profile.role === 'hod' && profile.department_id === req.department_id;
  const isAssignedEmployee = req.assigned_employee_id === user.id;

  const canApprove =
    (profile.role === 'hod' && isHodOfDept && req.status === 'Submitted') ||
    (profile.role === 'final_head' && req.status === 'HOD Approved') ||
    (profile.role === 'procurement_manager' && req.status === 'Final Head Approved');

  const canAssign = profile.role === 'section_manager' && req.status === 'Procurement Approved';

  const canResubmit =
    isRequester &&
    ['HOD Returned', 'Final Head Returned', 'Procurement Returned'].includes(req.status);

  const canComplete = isAssignedEmployee && req.status === 'Assigned';

  // Cloudinary returns a secure_url which we stored in attachment_path
  let attachmentUrl: string | null = req.attachment_path ?? null;

  const createdDate = new Date(req.created_at);

  let allEmployees: any[] = [];
  if (canAssign) {
    allEmployees = await db.query.profiles.findMany({
      where: eq(profiles.role, 'employee'),
      with: { department: { columns: { name: true } } },
      orderBy: (p: any, { asc }: any) => [asc(p.full_name)],
    });
  }

  return (
    <AppShell pageTitle={req.id} pageSubtitle={`Source Request · ${req.department?.name}`}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <Link href="/requests" className="btn btn-ghost btn-sm" style={{ marginBottom: 20, display: 'inline-flex' }}>
          <ArrowLeft size={15} /> Back to Requests
        </Link>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <span className="src-id" style={{ fontSize: 15 }}>{req.id}</span>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 6px' }}>
                {req.description.length > 100 ? req.description.slice(0, 100) + '…' : req.description}
              </h1>
              <StatusBadge status={req.status as any} animate={req.current_assignee_role !== null} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 20, flexWrap: 'wrap' }} className="divider">
            <MetaItem icon={<User size={14} />} label="Requester" value={req.requester?.full_name ?? '—'} />
            <MetaItem icon={<Building2 size={14} />} label="Department" value={req.department?.name ?? '—'} />
            <MetaItem icon={<Calendar size={14} />} label="Date" value={createdDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <MetaItem icon={<Clock size={14} />} label="Time" value={createdDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} />
            {req.assigned_employee && (
              <MetaItem icon={<User size={14} />} label="Assigned To" value={req.assigned_employee.full_name} />
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Description</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {req.description}
              </p>
            </div>

            {req.attachment_name && (
              <div className="card">
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Attachment</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Paperclip size={16} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)', flex: 1 }}>{req.attachment_name}</span>
                  {attachmentUrl && (
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={req.attachment_name}
                      className="btn btn-ghost btn-sm"
                    >
                      <Download size={14} /> Download
                    </a>
                  )}
                </div>
              </div>
            )}

            {canApprove && <ApprovalPanel request={req} userRole={profile.role} />}
            {canAssign && <AssignmentPanel request={req} availableEmployees={allEmployees} />}
            {canResubmit && <ResubmitPanel request={req} />}
            {canComplete && <CompletePanel request={req} />}
          </div>

          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Workflow History</h2>
            <WorkflowTimeline entries={(req as any).workflow_actions ?? []} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
