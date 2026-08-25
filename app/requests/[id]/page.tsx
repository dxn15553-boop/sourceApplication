import { redirect, notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/requests/StatusBadge';
import WorkflowTimeline from '@/components/requests/WorkflowTimeline';
import ApprovalPanel from '@/components/requests/ApprovalPanel';
import AssignmentPanel from '@/components/requests/AssignmentPanel';
import ResubmitPanel from '@/components/requests/ResubmitPanel';
import ReviewPanel from '@/components/requests/ReviewPanel';
import { ArrowLeft, Download, Paperclip, User, Building2, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import type { SourceRequest } from '@/lib/types';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests, profiles, departments } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

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
  const profile = { id: user.id, role: user.role, departmentIds: user.departmentIds || [], full_name: user.name };

  const allDepartments = await db.select().from(departments).orderBy(departments.name);

  const reqData = await db.query.sourceRequests.findFirst({
    where: eq(sourceRequests.id, id),
    with: {
      requester: { columns: { id: true, full_name: true, role: true } },
      department: { columns: { id: true, name: true } },
      assigned_employee: { columns: { id: true, full_name: true, role: true } },
      workflow_actions: {
        columns: { id: true, action: true, comment: true, created_at: true },
        with: { 
          actor: { columns: { id: true, full_name: true, role: true } }
        },
        orderBy: (actions: any, { asc }: any) => [asc(actions.created_at)],
      },
      required_reviews: {
        columns: { id: true, department_id: true, status: true, remarks: true },
        with: {
          department: { columns: { name: true } },
          reviewer: { columns: { full_name: true } }
        }
      }
    }
  });

  if (!reqData) notFound();

  const req = reqData as unknown as SourceRequest & {
    requester: { id: string; full_name: string; role: string };
    requester_department_id: string;
    department: { id: string; name: string };
    assigned_employee?: { id: string; full_name: string; role: string };
    required_reviews?: any[];
  };

  const isRequester = req.requester_id === user.id;
  const isHomeHod = profile.role === 'hod' && profile.departmentIds.includes(req.requester_department_id);
  const isAssignedEmployee = req.assigned_employee_id === user.id;

  const allReviewsApproved = req.status === 'Under Required Review' && (req.required_reviews || []).every((r: any) => r.status === 'Approved');

  const canApprove =
    (profile.role === 'hod' && isHomeHod && (req.status === 'Submitted' || req.status === 'Target Dept Approved' || req.status === 'Pending Home HOD Confirmation')) ||
    (profile.role === 'final_head' && (req.status === 'Final Head Review')) ||
    (profile.role === 'procurement_manager' && req.status === 'Final Head Approved');

  // Check if current user is an HOD of a department that needs to review
  const pendingReviewForUser = profile.role === 'hod'
    ? (req.required_reviews || []).find((r: any) => profile.departmentIds.includes(r.department_id) && r.status === 'Pending')
    : null;

  const canAssign = profile.role === 'section_manager' && req.status === 'Procurement Approved';

  const canResubmit =
    isRequester &&
    ['HOD Returned', 'Final Head Returned', 'Procurement Returned', 'Returned to Requester'].includes(req.status);
    
  const canHodResubmit = profile.role === 'hod' && isHomeHod && req.status === 'Returned to HOD';
  const canFinalHeadResubmit = profile.role === 'final_head' && req.status === 'Returned to Regional Head';

  // Cloudinary returns a secure_url which we stored in attachment_path
  let attachmentUrl: string | null = req.attachment_path ?? null;

  const createdDate = new Date(req.created_at);

  let allEmployees: any[] = [];
  if (canAssign) {
    allEmployees = await db.query.profiles.findMany({
      where: eq(profiles.role, 'employee'),
      with: { profileDepartments: { with: { department: { columns: { name: true } } } } },
      orderBy: (p: any, { asc }: any) => [asc(p.full_name)],
    });
  }

  return (
    <AppShell pageTitle={req.id} pageSubtitle={`Source Request · ${req.department?.name}`}>
      <div style={{ maxWidth: 1320, margin: '0 auto', paddingBottom: 40 }}>
        <Link href="/requests" className="btn btn-ghost btn-sm" style={{ marginBottom: 20, display: 'inline-flex' }}>
          <ArrowLeft size={16} style={{ marginRight: 4 }} /> Back to Requests
        </Link>

        {/* Top-level two-column grid: Content | Workflow History */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24, alignItems: 'start' }}>

          {/* LEFT COLUMN — All main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

            {/* Header Card */}
            <div className="card" style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span className="src-id" style={{ fontSize: 13, padding: '5px 10px' }}>{req.id}</span>
                <StatusBadge status={req.status as any} animate={req.current_assignee_role !== null || req.status === 'Under Required Review'} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                Source Request Details
              </h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
                Submitted on {createdDate.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>

              <div style={{ width: '100%', height: 1, background: 'var(--border)', margin: '20px 0 16px' }} />

              {/* Metadata Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                <MetaItem icon={<User size={15} />} label="Requester" value={`${((req as any).requester_name || req.requester?.full_name) ?? '—'}${req.requester_designation ? ` (${req.requester_designation})` : ''}`} />
                <MetaItem icon={<Building2 size={15} />} label="Target Department" value={req.department?.name ?? '—'} />
                <MetaItem icon={<Clock size={15} />} label="Time" value={createdDate.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} />
                {req.assigned_employee && (
                  <MetaItem icon={<User size={15} />} label="Assigned To" value={req.assigned_employee.full_name} />
                )}
              </div>
            </div>

            {/* Cross-Department Permissions */}
            {req.required_reviews && req.required_reviews.length > 0 && (
              <div className="card" style={{ padding: '20px 24px' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>Cross-Department Permissions</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {req.required_reviews.map((r: any) => (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10,
                      background: r.status === 'Approved' ? 'var(--success-glow)' : r.status === 'Rejected' ? 'var(--danger-glow)' : 'rgba(245, 158, 11, 0.05)',
                      border: `1px solid ${r.status === 'Approved' ? 'rgba(16,185,129,0.2)' : r.status === 'Rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.department?.name || 'Department'}</span>
                        <span style={{
                          padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          background: r.status === 'Approved' ? 'rgba(16,185,129,0.15)' : r.status === 'Rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                          color: r.status === 'Approved' ? 'var(--success)' : r.status === 'Rejected' ? 'var(--danger)' : '#d97706'
                        }}>
                          {r.status}
                        </span>
                      </div>
                      {r.reviewer && (
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                          Reviewed by: <strong>{r.reviewer.full_name}</strong>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--text-primary)' }}>Description</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>
                {req.description}
              </p>
            </div>

            {/* Attachment */}
            {req.attachment_name && (
              <div className="card" style={{ padding: '20px 24px' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--text-primary)' }}>Attachment</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-hover)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Paperclip size={17} />
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.attachment_name}
                  </span>
                  {attachmentUrl && (
                    <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" download={req.attachment_name} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                      <Download size={13} /> Download
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Action Panels */}
            {pendingReviewForUser && <ReviewPanel reviewId={pendingReviewForUser.id} departmentName={pendingReviewForUser.department.name} />}
            {canApprove && <ApprovalPanel request={req} userRole={profile.role} allDepartments={allDepartments} />}
            {(canHodResubmit || canFinalHeadResubmit) && <ResubmitPanel request={req} />}
            {canAssign && <AssignmentPanel request={req} availableEmployees={allEmployees} />}
            {canResubmit && <ResubmitPanel request={req} />}
          </div>

          {/* RIGHT COLUMN — Workflow History */}
          <div className="card" style={{ position: 'sticky', top: 80, padding: '24px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 20px', paddingBottom: 14, borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} style={{ color: 'var(--accent)' }} />
              Workflow History
            </h2>
            <WorkflowTimeline entries={(req as any).workflow_actions ?? []} />
          </div>

        </div>
      </div>
    </AppShell>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          {value}
        </div>
      </div>
    </div>
  );
}
