import { redirect, notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/requests/StatusBadge';
import WorkflowTimeline from '@/components/requests/WorkflowTimeline';
import ApprovalPanel from '@/components/requests/ApprovalPanel';
import AssignmentPanel from '@/components/requests/AssignmentPanel';
import ResubmitPanel from '@/components/requests/ResubmitPanel';
import ReviewPanel from '@/components/requests/ReviewPanel';
import { ArrowLeft, Download, Paperclip, User, Building2, Calendar, Clock, CheckCircle, AlertTriangle, XCircle, Truck, ShieldCheck, Package } from 'lucide-react';
import Link from 'next/link';
import type { SourceRequest } from '@/lib/types';
import EditRequestButton from '@/components/requests/EditRequestButton';
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
        columns: { id: true, department_id: true, status: true, remarks: true, created_at: true, attachment_path: true, attachment_name: true },
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
    (profile.role === 'hod' && isHomeHod && (req.status === 'Submitted' || req.status === 'Target Dept Approved' || req.status === 'Pending Home HOD Confirmation' || req.status === 'Returned to HOD')) ||
    (profile.role === 'regional_coordinator' && (req.status === 'Regional Coordinator Review' || req.status === 'HOD Approved')) ||
    ((profile.role === 'final_head' || profile.role === 'regional_coordinator') && (req.status === 'Final Head Review' || req.status === 'Returned to Regional Head')) ||
    (profile.role === 'procurement_manager' && req.status === 'Final Head Approved');

  // Check if current user is an HOD of a department that needs to review
  const pendingReviewForUser = profile.role === 'hod'
    ? (req.required_reviews || []).find((r: any) => profile.departmentIds.includes(r.department_id) && r.status === 'Pending')
    : null;

  const canAssign = profile.role === 'section_manager' && req.status === 'Procurement Approved';

  const canResubmit =
    isRequester &&
    ['HOD Returned', 'Final Head Returned', 'Procurement Returned', 'Returned to Requester'].includes(req.status);
    
  const canHodResubmit = false; // HOD uses ApprovalPanel
  const canFinalHeadResubmit = false; // Regional Head uses ApprovalPanel
  const canCoordinatorResubmit = profile.role === 'regional_coordinator' && req.status === 'Returned to Regional Coordinator';

  // Cloudinary returns a secure_url which we stored in attachment_path
  let attachmentUrl: string | null = req.attachment_path ?? null;

  const createdDate = new Date(req.created_at);

  const canEdit = isHomeHod && req.status === 'Returned to HOD';

  // Get only the latest review status per department for clean display
  const latestReviewsMap: Record<string, any> = {};
  (req.required_reviews || []).forEach((r: any) => {
    const existing = latestReviewsMap[r.department_id];
    if (!existing || new Date(r.created_at || 0) > new Date(existing.created_at || 0)) {
      latestReviewsMap[r.department_id] = r;
    }
  });
  const latestReviews = Object.values(latestReviewsMap);

  let allEmployees: any[] = [];
  if (canAssign) {
    const procurementDbUrl = process.env.PROCUREMENT_DATABASE_URL;
    if (procurementDbUrl) {
      try {
        const { neon } = await import('@neondatabase/serverless');
        const pSql = neon(procurementDbUrl);
        const rows = await pSql`
          SELECT u.id, u.name as "full_name", u.email, d.name as "department_name"
          FROM "User" u
          LEFT JOIN "Department" d ON u."departmentId" = d.id
          WHERE u.role = 'TEAM' AND u."isActive" = true
          ORDER BY u.name
        `;
        allEmployees = rows.map((r: any) => ({
          id: r.id,
          full_name: r.full_name,
          email: r.email,
          profileDepartments: r.department_name ? [{ department: { name: r.department_name } }] : []
        }));
      } catch (err) {
        console.error('Error fetching procurement employees:', err);
      }
    } else {
      allEmployees = await db.query.profiles.findMany({
        where: eq(profiles.role, 'employee'),
        with: { profileDepartments: { with: { department: { columns: { name: true } } } } },
        orderBy: (p: any, { asc }: any) => [asc(p.full_name)],
      });
    }
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span className="src-id" style={{ fontSize: 13, padding: '5px 10px' }}>{req.id}</span>
                    <StatusBadge status={req.status as any} animate={req.current_assignee_role !== null || req.status === 'Under Required Review'} />
                    {req.priority && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 99,
                          background:
                            ['URGENT', 'Urgent'].includes(req.priority)
                              ? 'rgba(239,68,68,0.15)'
                              : ['HIGH', 'High'].includes(req.priority)
                              ? 'rgba(245,158,11,0.15)'
                              : ['NORMAL', 'Normal', 'LOW', 'Low'].includes(req.priority)
                              ? 'rgba(16,185,129,0.15)'
                              : 'rgba(59,130,246,0.15)',
                          color:
                            ['URGENT', 'Urgent'].includes(req.priority)
                              ? 'var(--danger)'
                              : ['HIGH', 'High'].includes(req.priority)
                              ? 'var(--warning)'
                              : ['NORMAL', 'Normal', 'LOW', 'Low'].includes(req.priority)
                              ? 'var(--success)'
                              : 'var(--info)',
                          border: '1px solid currentColor',
                        }}
                      >
                        {['URGENT', 'Urgent'].includes(req.priority) && '🔴 '}
                        {['HIGH', 'High'].includes(req.priority) && '🟠 '}
                        {['IMPORTANT', 'Important', 'MEDIUM', 'Medium'].includes(req.priority) && '🔵 '}
                        {['NORMAL', 'Normal', 'LOW', 'Low'].includes(req.priority) && '🟢 '}
                        Priority: {req.priority}
                      </span>
                    )}
                  </div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                    Source Request Details
                  </h1>
                  <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
                    Submitted on {createdDate.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                {canEdit && (
                  <EditRequestButton request={req} />
                )}
              </div>

              <div style={{ width: '100%', height: 1, background: 'var(--border)', margin: '20px 0 16px' }} />

              {/* Metadata Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                <MetaItem icon={<User size={15} />} label="Requester" value={`${((req as any).requester_name || req.requester?.full_name) ?? '—'}${req.requester_designation ? ` (${req.requester_designation})` : ''}`} />
                <MetaItem icon={<Building2 size={15} />} label="Target Department" value={req.department?.name ?? '—'} />
                <MetaItem icon={<Clock size={15} />} label="Submitted Time" value={createdDate.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} />
                {req.required_by_date && (
                  <MetaItem icon={<Calendar size={15} />} label="Expected Date" value={new Date(req.required_by_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })} />
                )}
                {req.assigned_employee && (
                  <MetaItem icon={<User size={15} />} label="Assigned To" value={req.assigned_employee.full_name} />
                )}
              </div>
            </div>

            {/* User Department Reviews */}
            {latestReviews && latestReviews.length > 0 && (
              <div className="card" style={{ padding: '20px 24px' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>User Department Reviews</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {latestReviews.map((r: any) => {
                    const isApproved = r.status === 'Approved';
                    const isReturned = r.status === 'Returned' || r.status === 'Rejected';
                    return (
                      <div key={r.id} style={{
                        display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', borderRadius: 10,
                        background: isApproved ? 'var(--success-glow)' : isReturned ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.05)',
                        border: `1px solid ${isApproved ? 'rgba(16,185,129,0.2)' : isReturned ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245,158,11,0.2)'}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.department?.name || 'Department'}</span>
                            <span style={{
                              padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                              background: isApproved ? 'rgba(16,185,129,0.15)' : isReturned ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245,158,11,0.15)',
                              color: isApproved ? 'var(--success)' : isReturned ? '#d97706' : '#d97706'
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
                        {isReturned && r.remarks && (
                          <div style={{ 
                            fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px', 
                            background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, 
                            borderLeft: '3px solid #f59e0b', marginTop: 4 
                          }}>
                            <strong>Return Reason:</strong> &ldquo;{r.remarks}&rdquo;
                          </div>
                        )}
                        {r.remarks && !isReturned && (
                          <div style={{ 
                            fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px', 
                            background: 'rgba(16,185,129,0.04)', borderRadius: 6, 
                            borderLeft: '3px solid var(--success)', marginTop: 4 
                          }}>
                            <strong>Remarks:</strong> &ldquo;{r.remarks}&rdquo;
                          </div>
                        )}
                      {r.attachment_name && (
                        <div style={{ 
                          display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, 
                          padding: '6px 12px', background: 'var(--bg-hover)', borderRadius: 6,
                          border: '1px dashed var(--border)', maxWidth: 'max-content'
                        }}>
                          <Paperclip size={13} style={{ color: 'var(--accent)' }} />
                          <a href={r.attachment_path} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'underline' }}>
                            {r.attachment_name}
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            )}

            {/* Purpose / Justification (if provided) */}
            {req.purpose_justification && (
              <div className="card" style={{ padding: '20px 24px', background: 'rgba(59,130,246,0.03)', borderColor: 'rgba(59,130,246,0.15)' }}>
                <h2 style={{ fontSize: 14.5, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>Purpose / Justification</h2>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {req.purpose_justification}
                </p>
              </div>
            )}

            {/* Description */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--text-primary)' }}>Description</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>
                {req.description}
              </p>
            </div>

            {/* Attachments / Supporting Documents */}
            {(() => {
              let allAttachments: { name: string; path: string; size?: number }[] = [];
              if (req.attachments) {
                try {
                  const parsed = typeof req.attachments === 'string' ? JSON.parse(req.attachments) : req.attachments;
                  if (Array.isArray(parsed)) allAttachments = parsed;
                } catch (e) {}
              }
              if (allAttachments.length === 0 && req.attachment_name && req.attachment_path) {
                allAttachments = [{ name: req.attachment_name, path: req.attachment_path }];
              }

              if (allAttachments.length === 0) return null;

              return (
                <div className="card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Supporting Documents ({allAttachments.length})
                    </h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {allAttachments.map((att, idx) => (
                      <div
                        key={`${att.name}-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          background: 'var(--bg-hover)',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: 'var(--accent-glow)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent)',
                            flexShrink: 0,
                          }}
                        >
                          <Paperclip size={17} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            {att.name}
                          </span>
                          {att.size && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {(att.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          )}
                        </div>
                        {att.path && (
                          <a
                            href={att.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={att.name}
                            className="btn btn-primary btn-sm"
                            style={{ flexShrink: 0 }}
                          >
                            <Download size={13} /> View / Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Delivery Logistics & QC Inspection Details (Step 15) if logged */}
            {req.ordered_qty !== null && req.ordered_qty !== undefined && (
              <div className="card animate-fade-in" style={{ padding: '22px 26px', borderTop: '4px solid #10b981' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                    <Package size={18} style={{ color: '#10b981' }} /> Step 15: Delivery Logistics & QC Inspection
                  </h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {req.qc_status && (
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 99,
                          background:
                            req.qc_status === 'Passed'
                              ? 'rgba(16,185,129,0.15)'
                              : req.qc_status === 'Conditionally Accepted'
                              ? 'rgba(245,158,11,0.15)'
                              : 'rgba(239,68,68,0.15)',
                          color:
                            req.qc_status === 'Passed'
                              ? 'var(--success)'
                              : req.qc_status === 'Conditionally Accepted'
                              ? 'var(--warning)'
                              : 'var(--danger)',
                          border: '1px solid currentColor',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <ShieldCheck size={13} /> QC: {req.qc_status}
                      </span>
                    )}
                    {req.on_time_delivery !== null && req.on_time_delivery !== undefined && (
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 99,
                          background: req.on_time_delivery ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: req.on_time_delivery ? 'var(--success)' : 'var(--danger)',
                          border: '1px solid currentColor',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {req.on_time_delivery ? '🟢 On-Time Delivery' : '🔴 Delivery Delayed'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantities grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Ordered Qty</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{req.ordered_qty}</div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Received Qty</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      {req.received_qty ?? ((req.accepted_qty || 0) + (req.rejected_qty || 0))}
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase' }}>Accepted Qty</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)', marginTop: 2 }}>{req.accepted_qty ?? 0}</div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: (req.rejected_qty || 0) > 0 ? 'rgba(239,68,68,0.08)' : 'var(--bg-hover)', border: (req.rejected_qty || 0) > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: (req.rejected_qty || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Rejected Qty</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: (req.rejected_qty || 0) > 0 ? 'var(--danger)' : 'var(--text-primary)', marginTop: 2 }}>{req.rejected_qty ?? 0}</div>
                  </div>
                </div>

                {/* Rejection notice if any */}
                {(req.rejected_qty || 0) > 0 && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 14 }}>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>
                      ⚠️ Rejection Rate: {(((req.rejected_qty || 0) / (req.received_qty || ((req.accepted_qty || 0) + (req.rejected_qty || 0)) || 1)) * 100).toFixed(1)}%
                    </p>
                    {req.rejection_reason && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <strong>Reason:</strong> {req.rejection_reason}
                      </p>
                    )}
                  </div>
                )}

                {/* Dates & Remarks */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {req.promised_delivery_date && (
                    <div>📅 <strong>Promised Date:</strong> {new Date(req.promised_delivery_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  )}
                  {req.material_dispatch_date && (
                    <div>🚚 <strong>Dispatch Date (MDD):</strong> {new Date(req.material_dispatch_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  )}
                  {req.material_received_date && (
                    <div>📦 <strong>Received Date (MRD):</strong> {new Date(req.material_received_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  )}
                </div>

                {req.qc_remarks && (
                  <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <strong>QC Remarks:</strong> {req.qc_remarks}
                  </p>
                )}
              </div>
            )}

            {/* Action Panels */}
            {pendingReviewForUser && <ReviewPanel reviewId={pendingReviewForUser.id} departmentName={pendingReviewForUser.department.name} />}
            {canApprove && <ApprovalPanel request={req} userRole={profile.role} allDepartments={allDepartments} />}
            {(canHodResubmit || canFinalHeadResubmit || canCoordinatorResubmit) && <ResubmitPanel request={req} />}
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
