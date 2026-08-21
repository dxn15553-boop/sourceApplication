import { redirect, notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/requests/StatusBadge';
import WorkflowTimeline from '@/components/requests/WorkflowTimeline';
import ApprovalPanel from '@/components/requests/ApprovalPanel';
import AssignmentPanel from '@/components/requests/AssignmentPanel';
import ResubmitPanel from '@/components/requests/ResubmitPanel';
import PaymentPanel from '@/components/requests/PaymentPanel';
import DeliveryPanel from '@/components/requests/DeliveryPanel';
import CompletePanel from '@/components/requests/CompletePanel';
import SelectReviewersPanel from '@/components/requests/SelectReviewersPanel';
import ReviewPanel from '@/components/requests/ReviewPanel';
import VendorEvaluationPanel from '@/components/requests/VendorEvaluationPanel';
import PRCreationPanel from '@/components/requests/PRCreationPanel';
import POCreationPanel from '@/components/requests/POCreationPanel';
import { ArrowLeft, Download, Paperclip, User, Building2, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import type { SourceRequest } from '@/lib/types';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests, profiles } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

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

    department: { id: string; name: string };
    assigned_employee?: { id: string; full_name: string; role: string };
    required_reviews?: any[];
  };

  const isRequester = req.requester_id === user.id;
  const isHodOfDept = profile.role === 'hod' && profile.department_id === req.department_id;
  const isAssignedEmployee = req.assigned_employee_id === user.id;

  const allReviewsApproved = req.status === 'Under Required Review' && (req.required_reviews || []).every((r: any) => r.status === 'Approved');

  const canApprove =
    (profile.role === 'hod' && isHodOfDept && req.status === 'Submitted') ||
    (profile.role === 'final_head' && (req.status === 'Final Head Review' || (req.status === 'Under Required Review' && allReviewsApproved))) ||
    (profile.role === 'procurement_manager' && req.status === 'Final Head Approved');

  const canAssignRequiredReviews = isRequester && req.status === 'HOD Approved';

  // Check if current user is an HOD of a department that needs to review
  const pendingReviewForUser = profile.role === 'hod'
    ? (req.required_reviews || []).find((r: any) => r.department_id === profile.department_id && r.status === 'Pending')
    : null;

  const canAssign = profile.role === 'section_manager' && req.status === 'Procurement Approved';

  const canResubmit =
    isRequester &&
    ['HOD Returned', 'Final Head Returned', 'Procurement Returned', 'Returned to Requester'].includes(req.status);
    
  const canHodResubmit = profile.role === 'hod' && isHodOfDept && req.status === 'Returned to HOD';
  const canFinalHeadResubmit = profile.role === 'final_head' && req.status === 'Returned to Regional Head';

  const canEvaluateVendor = profile.role === 'employee' && isAssignedEmployee && req.status === 'Assigned';
  const canCreatePr = profile.role === 'employee' && isAssignedEmployee && req.status === 'Vendor Evaluation';
  const canCreatePo = profile.role === 'employee' && isAssignedEmployee && req.status === 'PR Created';
  const canLogPayment = profile.role === 'employee' && isAssignedEmployee && req.status === 'PO Created';
  const canLogDelivery = profile.role === 'employee' && isAssignedEmployee && req.status === 'Payment Pending';
  const canComplete = isAssignedEmployee && req.status === 'Delivered';

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

  let allDepartments: any[] = [];
  if (canAssignRequiredReviews) {
    allDepartments = await db.query.departments.findMany({
      orderBy: (d: any, { asc }: any) => [asc(d.name)],
    });
  }



  return (
    <AppShell pageTitle={req.id} pageSubtitle={`Source Request · ${req.department?.name}`}>
      <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
        <Link href="/requests" className="btn btn-ghost btn-sm" style={{ marginBottom: 24, display: 'inline-flex' }}>
          <ArrowLeft size={16} style={{ marginRight: 4 }} /> Back to Requests
        </Link>

        {/* Main Header Card */}
        <div className="card glass-strong" style={{ marginBottom: 24, padding: '32px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span className="src-id" style={{ fontSize: 14, padding: '6px 12px' }}>{req.id}</span>
                <StatusBadge status={req.status as any} animate={req.current_assignee_role !== null || req.status === 'Under Required Review'} />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                Source Request Details
              </h1>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
                Submitted on {createdDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg, var(--border-strong), transparent)', margin: '32px 0 24px' }} />

          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
            <MetaItem icon={<User size={16} />} label="Requester" value={((req as any).requester_name || req.requester?.full_name) ?? '—'} />
            <MetaItem icon={<Building2 size={16} />} label="Department" value={req.department?.name ?? '—'} />
            <MetaItem icon={<Clock size={16} />} label="Time" value={createdDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} />
            {req.assigned_employee && (
              <MetaItem icon={<User size={16} />} label="Assigned To" value={req.assigned_employee.full_name} />
            )}
          </div>
        </div>

        {/* Required Reviews Tracker */}
        {req.required_reviews && req.required_reviews.length > 0 && (
          <div className="card glass-strong" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>Required Reviews</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {req.required_reviews.map((r: any) => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 99,
                  background: r.status === 'Approved' ? 'var(--success-glow)' : r.status === 'Rejected' ? 'var(--danger-glow)' : 'rgba(245, 158, 11, 0.15)',
                  border: `1px solid ${r.status === 'Approved' ? 'rgba(16, 185, 129, 0.2)' : r.status === 'Rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.department.name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    color: r.status === 'Approved' ? 'var(--success)' : r.status === 'Rejected' ? 'var(--danger)' : '#d97706'
                  }}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>

          {/* Left Column: Details & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            <div className="card glass">
              <div className="card-header" style={{ marginBottom: 20, paddingBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Description</h2>
              </div>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                {req.description}
              </p>
            </div>

            {req.attachment_name && (
              <div className="card glass">
                <div className="card-header" style={{ marginBottom: 20, paddingBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Attachment</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.4)', padding: '16px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Paperclip size={20} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.attachment_name}
                  </span>
                  {attachmentUrl && (
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={req.attachment_name}
                      className="btn btn-primary btn-sm"
                      style={{ flexShrink: 0 }}
                    >
                      <Download size={14} /> Download
                    </a>
                  )}
                </div>
              </div>
            )}

            {canAssignRequiredReviews && <SelectReviewersPanel requestId={req.id} departments={allDepartments} />}
            {pendingReviewForUser && <ReviewPanel reviewId={pendingReviewForUser.id} departmentName={pendingReviewForUser.department.name} />}

            {canApprove && <ApprovalPanel request={req} userRole={profile.role} />}
            {(canHodResubmit || canFinalHeadResubmit) && <ResubmitPanel request={req} />}
            {canAssign && <AssignmentPanel request={req} availableEmployees={allEmployees} />}
            {canEvaluateVendor && <VendorEvaluationPanel requestId={req.id} />}
            {canCreatePr && <PRCreationPanel requestId={req.id} />}
            {canCreatePo && <POCreationPanel requestId={req.id} />}
            {canLogPayment && <PaymentPanel requestId={req.id} />}
            {canLogDelivery && <DeliveryPanel requestId={req.id} />}
            {canResubmit && <ResubmitPanel request={req} />}
            {canComplete && <CompletePanel request={req} />}
          </div>

          {/* Right Column: Workflow History */}
          <div className="card glass-strong" style={{ position: 'sticky', top: 100, padding: '32px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
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
