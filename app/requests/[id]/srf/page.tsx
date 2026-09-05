import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { sourceRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ArrowLeft, CheckCircle2, ShieldCheck, Clock, FileText, Download, Building2, User, Calendar, Paperclip } from 'lucide-react';
import PrintButton from '@/components/requests/PrintButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `SRF - ${id}` };
}

export default async function SourceRequestFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login');

  const reqData = await db.query.sourceRequests.findFirst({
    where: eq(sourceRequests.id, id),
    with: {
      requester: { columns: { id: true, full_name: true, role: true } },
      department: { columns: { id: true, name: true } },
      assigned_employee: { columns: { id: true, full_name: true, role: true } },
      workflow_actions: {
        columns: { id: true, action: true, comment: true, created_at: true },
        with: {
          actor: { columns: { id: true, full_name: true, role: true } },
        },
        orderBy: (actions: any, { asc }: any) => [asc(actions.created_at)],
      },
      required_reviews: {
        columns: { id: true, department_id: true, status: true, remarks: true, created_at: true, attachment_name: true },
        with: {
          department: { columns: { name: true } },
          reviewer: { columns: { full_name: true } },
        },
        orderBy: (reviews: any, { asc }: any) => [asc(reviews.created_at)],
      },
    },
  });

  if (!reqData) notFound();

  const req = reqData as any;
  const srfNo = req.srf_number || req.id.replace('SRC-', 'SRF-');
  const srfDate = req.srf_date ? new Date(req.srf_date) : new Date(req.created_at);
  const requestDate = new Date(req.request_date || req.created_at);

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

  // Parse key workflow stages for the approval sign-off table
  const actions = req.workflow_actions || [];
  const submissionAction = actions.find((a: any) => a.action === 'submitted');
  const hodAction = actions.filter((a: any) => a.action === 'approved' && a.actor?.role === 'hod').slice(-1)[0];
  const regCoordAction = actions.filter((a: any) => a.action === 'approved' && a.actor?.role === 'regional_coordinator').slice(-1)[0];
  const finalHeadAction = actions.filter((a: any) => a.action === 'approved' && a.actor?.role === 'final_head').slice(-1)[0];
  const procMgrAction = actions.filter((a: any) => a.action === 'approved' && a.actor?.role === 'procurement_manager').slice(-1)[0];
  const assignmentAction = actions.filter((a: any) => a.action === 'assigned').slice(-1)[0];
  const acceptAction = actions.filter((a: any) => a.action === 'processing_started').slice(-1)[0];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', padding: '24px 16px' }}>
      {/* Printable CSS style rules */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #1e293b !important;
            font-size: 11pt;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .srf-document-container {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .srf-section {
            page-break-inside: avoid;
            margin-bottom: 16px !important;
          }
          .srf-table {
            page-break-inside: avoid;
          }
          .srf-box {
            border: 1px solid #cbd5e1 !important;
            background: #ffffff !important;
          }
          .srf-header-title {
            color: #0f172a !important;
          }
          a {
            text-decoration: none !important;
            color: inherit !important;
          }
        }
      `}</style>

      {/* Screen-only top action bar */}
      <div
        className="no-print"
        style={{
          maxWidth: 960,
          margin: '0 auto 20px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 18px',
          background: 'var(--bg-surface, #1e293b)',
          borderRadius: 12,
          border: '1px solid var(--border, rgba(255,255,255,0.1))',
        }}
      >
        <Link
          href={`/requests/${req.id}`}
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Request Details</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Official Source Request Form (SRF)
          </span>
          <PrintButton label="Print / Download PDF" />
        </div>
      </div>

      {/* Main SRF Document Sheet */}
      <div
        className="srf-document-container"
        style={{
          maxWidth: 960,
          margin: '0 auto',
          background: '#ffffff',
          color: '#1e293b',
          borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
          padding: '40px 48px',
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
          lineHeight: 1.5,
        }}
      >
        {/* Document Header */}
        <div
          className="srf-section"
          style={{
            textAlign: 'center',
            borderBottom: '2px solid #0f172a',
            paddingBottom: 14,
            marginBottom: 20,
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            SOURCE REQUEST FORM (SRF)
          </h1>
        </div>

        {/* SRF Numbers & Meta Grid */}
        <div
          className="srf-section"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '14px 18px',
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>SRF Number</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>{srfNo}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>SRF Issue Date</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
              {srfDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Source Req ID</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{req.id}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Workflow Status</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{req.status}</div>
          </div>
        </div>

        {/* Section 1: Requisition Details */}
        <div className="srf-section" style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: '#e2e8f0',
              padding: '6px 12px',
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            1. Requisition Details
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px', width: '22%', fontWeight: 700, color: '#475569', background: '#f8fafc' }}>
                  Requester Name:
                </td>
                <td style={{ padding: '8px 10px', width: '28%', fontWeight: 600, color: '#0f172a' }}>
                  {req.requester_name || req.requester?.full_name || '—'}
                </td>
                <td style={{ padding: '8px 10px', width: '22%', fontWeight: 700, color: '#475569', background: '#f8fafc' }}>
                  Designation:
                </td>
                <td style={{ padding: '8px 10px', width: '28%', fontWeight: 600, color: '#0f172a' }}>
                  {req.requester_designation || 'Staff / Officer'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#475569', background: '#f8fafc' }}>
                  Target Department:
                </td>
                <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                  {req.department?.name || '—'}
                </td>
                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#475569', background: '#f8fafc' }}>
                  Date of Requisition:
                </td>
                <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                  {requestDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#475569', background: '#f8fafc' }}>
                  Priority Level:
                </td>
                <td style={{ padding: '8px 10px', fontWeight: 700, color: ['Urgent', 'URGENT'].includes(req.priority) ? '#dc2626' : '#0f172a' }}>
                  {req.priority || 'Normal'}
                </td>
                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#475569', background: '#f8fafc' }}>
                  Required / Expected Date:
                </td>
                <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                  {req.required_by_date
                    ? new Date(req.required_by_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Standard Lead Time'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Requirement & Justification */}
        <div className="srf-section" style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: '#e2e8f0',
              padding: '6px 12px',
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            2. Requirement &amp; Justification
          </div>

          {req.purpose_justification && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                Business Purpose / Justification:
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: '#1e293b',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '10px 14px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {req.purpose_justification}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
              Item / Service Specifications:
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: '#1e293b',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: '12px 14px',
                whiteSpace: 'pre-wrap',
                minHeight: 80,
              }}
            >
              {req.description}
            </div>
          </div>

          {allAttachments.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                Attached Supporting Documents ({allAttachments.length}):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allAttachments.map((att, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11.5,
                      padding: '4px 10px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      color: '#334155',
                    }}
                  >
                    <Paperclip size={12} />
                    <span>{att.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Handler Assignment */}
        <div className="srf-section" style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: '#e2e8f0',
              padding: '6px 12px',
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            3. Handler Assignment
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            {/* Nomination Box */}
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '12px 16px',
                background: '#f8fafc',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: 8 }}>
                Section Manager Nomination
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                <strong>Nominated Handler:</strong>{' '}
                <span style={{ color: '#0f172a', fontWeight: 700 }}>
                  {req.assigned_employee?.full_name || 'Pending Nomination'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                <strong>Nominated On:</strong>{' '}
                {assignmentAction
                  ? new Date(assignmentAction.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : req.srf_date
                  ? new Date(req.srf_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                <strong>Nominated By:</strong>{' '}
                {assignmentAction?.actor?.full_name || 'Section Manager Procurement'}
              </div>
            </div>

            {/* Acknowledgment Box */}
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '12px 16px',
                background: req.handler_accepted_at ? '#f0fdf4' : '#fffbeb',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: 8 }}>
                Handler Acknowledgment &amp; Acceptance
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                <strong>Acknowledgment Status:</strong>{' '}
                <span
                  style={{
                    fontWeight: 700,
                    color: req.handler_accepted_at ? '#16a34a' : '#d97706',
                  }}
                >
                  {req.handler_accepted_at ? '✓ Acknowledged & In Process' : '⏳ Pending Acknowledgment'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                <strong>Accepted At:</strong>{' '}
                {req.handler_accepted_at
                  ? new Date(req.handler_accepted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Pending'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {req.handler_accepted_at
                  ? 'Procurement Handler acknowledged SRF and initiated Vendor Evaluation.'
                  : 'Nominated Handler will review specifications and acknowledge to start procurement.'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Approval Sign-Offs */}
        <div className="srf-section srf-table">
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: '#e2e8f0',
              padding: '6px 12px',
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            4. Approval Sign-Offs
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 11.5,
              border: '1px solid #cbd5e1',
            }}
          >
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155', width: '22%' }}>Approval Tier / Role</th>
                <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155', width: '20%' }}>Signatory Name</th>
                <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155', width: '15%' }}>Decision</th>
                <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155', width: '18%' }}>Timestamp</th>
                <th style={{ padding: '8px 10px', fontWeight: 800, color: '#334155', width: '25%' }}>Comments / Remarks</th>
              </tr>
            </thead>
            <tbody>
              {/* 1. Submission */}
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a' }}>1. Requisition Submission</td>
                <td style={{ padding: '7px 10px' }}>{req.requester_name || req.requester?.full_name}</td>
                <td style={{ padding: '7px 10px', color: '#16a34a', fontWeight: 700 }}>Submitted</td>
                <td style={{ padding: '7px 10px', color: '#64748b' }}>
                  {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '7px 10px', color: '#475569' }}>Initial Source Requisition</td>
              </tr>

              {/* 2. User Dept Reviews */}
              {(req.required_reviews || []).map((rev: any, idx: number) => (
                <tr key={rev.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a' }}>
                    2.{idx + 1} Target Dept Review ({rev.department?.name})
                  </td>
                  <td style={{ padding: '7px 10px' }}>{rev.reviewer?.full_name || 'Department Reviewer'}</td>
                  <td style={{ padding: '7px 10px', color: rev.status === 'Approved' ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                    {rev.status}
                  </td>
                  <td style={{ padding: '7px 10px', color: '#64748b' }}>
                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '7px 10px', color: '#475569' }}>{rev.remarks || '—'}</td>
                </tr>
              ))}

              {/* 3. Home HOD */}
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a' }}>3. Home HOD Approval</td>
                <td style={{ padding: '7px 10px' }}>{hodAction?.actor?.full_name || 'Head of Department'}</td>
                <td style={{ padding: '7px 10px', color: hodAction ? '#16a34a' : '#64748b', fontWeight: 700 }}>
                  {hodAction ? 'Approved' : 'Pending / Not Recorded'}
                </td>
                <td style={{ padding: '7px 10px', color: '#64748b' }}>
                  {hodAction?.created_at ? new Date(hodAction.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td style={{ padding: '7px 10px', color: '#475569' }}>{req.hod_remarks || hodAction?.comment || '—'}</td>
              </tr>

              {/* 4. Regional Coordinator */}
              {regCoordAction && (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a' }}>4. Regional Coordinator</td>
                  <td style={{ padding: '7px 10px' }}>{regCoordAction.actor?.full_name || 'Regional Coordinator'}</td>
                  <td style={{ padding: '7px 10px', color: '#16a34a', fontWeight: 700 }}>Verified &amp; Forwarded</td>
                  <td style={{ padding: '7px 10px', color: '#64748b' }}>
                    {new Date(regCoordAction.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '7px 10px', color: '#475569' }}>{regCoordAction.comment || '—'}</td>
                </tr>
              )}

              {/* 5. Regional Head */}
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a' }}>5. Regional Head Approval</td>
                <td style={{ padding: '7px 10px' }}>{finalHeadAction?.actor?.full_name || 'Regional Head'}</td>
                <td style={{ padding: '7px 10px', color: finalHeadAction ? '#16a34a' : '#64748b', fontWeight: 700 }}>
                  {finalHeadAction ? 'Approved' : 'Pending / Not Recorded'}
                </td>
                <td style={{ padding: '7px 10px', color: '#64748b' }}>
                  {finalHeadAction?.created_at ? new Date(finalHeadAction.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td style={{ padding: '7px 10px', color: '#475569' }}>{finalHeadAction?.comment || '—'}</td>
              </tr>

              {/* 6. Procurement Manager */}
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a' }}>6. Procurement Manager</td>
                <td style={{ padding: '7px 10px' }}>{procMgrAction?.actor?.full_name || 'Procurement Manager'}</td>
                <td style={{ padding: '7px 10px', color: procMgrAction ? '#16a34a' : '#64748b', fontWeight: 700 }}>
                  {procMgrAction ? 'Approved' : 'Pending'}
                </td>
                <td style={{ padding: '7px 10px', color: '#64748b' }}>
                  {procMgrAction?.created_at ? new Date(procMgrAction.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td style={{ padding: '7px 10px', color: '#475569' }}>{procMgrAction?.comment || '—'}</td>
              </tr>

              {/* 7. Section Manager Assignment */}
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a' }}>7. Section Manager Review &amp; Nomination</td>
                <td style={{ padding: '7px 10px' }}>{assignmentAction?.actor?.full_name || 'Section Manager Procurement'}</td>
                <td style={{ padding: '7px 10px', color: assignmentAction ? '#0284c7' : '#64748b', fontWeight: 700 }}>
                  {assignmentAction ? 'Nominated & SRF Issued' : 'Pending'}
                </td>
                <td style={{ padding: '7px 10px', color: '#64748b' }}>
                  {assignmentAction?.created_at ? new Date(assignmentAction.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : req.srf_date ? new Date(req.srf_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td style={{ padding: '7px 10px', color: '#475569' }}>
                  {assignmentAction?.comment || (req.assigned_employee ? `Nominated handler: ${req.assigned_employee.full_name}` : '—')}
                </td>
              </tr>

              {/* 8. Handler Acknowledgment */}
              <tr>
                <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a' }}>8. Handler Acknowledgment</td>
                <td style={{ padding: '7px 10px' }}>{req.assigned_employee?.full_name || 'Procurement Handler'}</td>
                <td style={{ padding: '7px 10px', color: req.handler_accepted_at ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                  {req.handler_accepted_at ? 'Acknowledged' : 'Pending'}
                </td>
                <td style={{ padding: '7px 10px', color: '#64748b' }}>
                  {req.handler_accepted_at ? new Date(req.handler_accepted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td style={{ padding: '7px 10px', color: '#475569' }}>
                  {acceptAction?.comment || (req.handler_accepted_at ? 'Handler accepted SRF and commenced vendor sourcing.' : 'Pending handler acceptance')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>


      </div>
    </div>
  );
}
