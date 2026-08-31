'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import { CheckCircle2, XCircle, RotateCcw, AlertCircle, Send } from 'lucide-react';
import type { SourceRequest } from '@/lib/types';

interface ApprovalPanelProps {
  request: SourceRequest;
  userRole: string;
  allDepartments?: { id: string; name: string }[];
}

type ActionType = 'approve' | 'reject' | 'return' | null;

const ACTION_CONFIG = {
  approve: { label: 'Approve',        icon: <CheckCircle2 size={15} />, btnClass: 'btn-success', title: 'Confirm Approval',             requiresComment: false },
  reject:  { label: 'Reject',         icon: <XCircle size={15} />,      btnClass: 'btn-danger',  title: 'Reject Request',               requiresComment: true  },
  return:  { label: 'Return',         icon: <RotateCcw size={15} />,    btnClass: 'btn-warning', title: 'Return for Correction',        requiresComment: true  },
};

const RETURN_OPTIONS: Record<string, { label: string, value: string }[]> = {
  procurement_manager: [
    { label: 'Regional Head (1 step back)', value: 'final_head' },
    { label: 'Regional Coordinator (2 steps back)', value: 'regional_coordinator' },
    { label: 'Head of Department (3 steps back)', value: 'hod' },
    { label: 'Requester (Start over)', value: 'user' },
  ],
  final_head: [
    { label: 'Regional Coordinator (1 step back)', value: 'regional_coordinator' },
    { label: 'Head of Department (2 steps back)', value: 'hod' },
    { label: 'Requester (Start over)', value: 'user' },
  ],
  regional_coordinator: [
    { label: 'Head of Department (1 step back)', value: 'hod' },
    { label: 'Requester (Start over)', value: 'user' },
  ],
  hod: [
    { label: 'Requester', value: 'user' }
  ]
};

export default function ApprovalPanel({ request, userRole, allDepartments }: ApprovalPanelProps) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');

  const [returnTo, setReturnTo] = useState('');
  const [returnToError, setReturnToError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDepts, setSelectedDepts] = useState<string[]>(() => {
    const reviews = (request as any).required_reviews || [];
    const uniqueIds = Array.from(new Set(reviews.map((r: any) => r.department_id))) as string[];
    return uniqueIds;
  });
  const [noneSelected, setNoneSelected] = useState(() => {
    const reviews = (request as any).required_reviews || [];
    return reviews.length === 0;
  });
  const [deptValidationError, setDeptValidationError] = useState<string | null>(null);
  const [rhAvailability, setRhAvailability] = useState<'available' | 'unavailable'>('available');

  const isInitialHodApproval = (request.status === 'Submitted' || request.status === 'Returned to HOD') && userRole === 'hod';
  const showSendLabel = isInitialHodApproval && !noneSelected;

  const getActionLabelText = (act: ActionType) => {
    if (!act) return '';
    if (act === 'approve' && showSendLabel) return 'Send for Approval';
    return ACTION_CONFIG[act].label;
  };

  const getActionTitleText = (act: ActionType) => {
    if (!act) return '';
    if (act === 'approve' && showSendLabel) return 'Send for Approval';
    return ACTION_CONFIG[act].title;
  };

  const isCoordinatorActingAsFinalHead = userRole === 'regional_coordinator' && 
    (request.status === 'Final Head Review' || request.status === 'Returned to Regional Head');
  const returnRole = isCoordinatorActingAsFinalHead ? 'final_head' : userRole;

  async function executeAction(action: ActionType) {
    if (!action) return;
    const cfg = ACTION_CONFIG[action];

    if (cfg.requiresComment && !comment.trim()) {
      setCommentError('Please provide a reason or comment.');
      return;
    }



    if (activeAction === 'return') {
      const options = RETURN_OPTIONS[returnRole] || [];
      if (options.length > 0 && !returnTo) {
        setReturnToError('Please select who to return the request to.');
        return;
      }
    }

    if (activeAction === 'approve' && userRole === 'hod') {
      const isInitialHodApproval = request.status === 'Submitted' || request.status === 'Returned to HOD';
      if (isInitialHodApproval) {
        if (selectedDepts.length === 0 && !noneSelected) {
          setDeptValidationError('You must select at least one department, or set "None / N/A" to Yes.');
          return;
        }

        // Find the latest review status for each department
        const latestReviews: Record<string, any> = {};
        ((request as any).required_reviews || []).forEach((r: any) => {
          const existing = latestReviews[r.department_id];
          if (!existing || new Date(r.created_at || 0) > new Date(existing.created_at || 0)) {
            latestReviews[r.department_id] = r;
          }
        });

        const rejectedDepts = Object.values(latestReviews).filter((r: any) => r.status === 'Rejected');
        const rejectedDeptIds = rejectedDepts.map((r: any) => r.department_id);

        // Verify if HOD has selected "Yes" for all previously rejected departments
        const missingApprovals = rejectedDeptIds.filter(id => !selectedDepts.includes(id));
        if (missingApprovals.length > 0) {
          const missingNames = missingApprovals.map(id => {
            const dept = allDepartments?.find(d => d.id === id);
            return dept ? dept.name : 'Unknown';
          }).join(', ');
          
          setDeptValidationError(`Cannot forward. You must select 'Yes' for the department(s) that previously returned/rejected the request: ${missingNames}.`);
          return;
        }
      }
    }

    setLoading(true);
    setError(null);
    try {
      const payload: any = { action, comment: comment.trim() || undefined, return_to: returnTo || undefined };
      if (userRole === 'hod') {
        payload.department_ids = noneSelected ? [] : selectedDepts;
      }
      if (isCoordinatorActingAsFinalHead) {
        payload.rh_availability = rhAvailability;
      }

      const res = await fetch(`/api/requests/${request.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Action failed.'); return; }

      setActiveAction(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{
        padding: '20px',
        background: 'rgba(59,130,246,0.05)',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 12,
        marginTop: 20,
      }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 14 }}>
          ⚡ Action Required — Your review is needed
        </p>

        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
            <AlertCircle size={15} style={{ color: 'var(--danger)' }} />
            <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Permission Required From checklist (Yes/No buttons) */}
        {userRole === 'hod' && (request.status === 'Submitted' || request.status === 'Returned to HOD') && allDepartments && (
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Permission Required From <span style={{ color: 'var(--danger)' }}>*</span>
            </label>

            {/* None / N/A Toggle Option */}
            <div style={{
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              maxWidth: '420px',
              marginBottom: 4
            }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                None / N/A (No additional permissions needed)
              </span>
              <div style={{ display: 'flex', gap: 2, background: 'rgba(255, 255, 255, 0.05)', padding: 2, borderRadius: 6, border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setNoneSelected(true);
                    setSelectedDepts([]);
                    setDeptValidationError(null);
                  }}
                  style={{
                    padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 4, cursor: 'pointer', border: 'none',
                    background: noneSelected ? 'var(--success)' : 'transparent',
                    color: noneSelected ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                    boxShadow: noneSelected ? '0 1px 4px rgba(16,185,129,0.3)' : 'none'
                  }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setNoneSelected(false);
                    setDeptValidationError(null);
                  }}
                  style={{
                    padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 4, cursor: 'pointer', border: 'none',
                    background: !noneSelected ? 'var(--danger)' : 'transparent',
                    color: !noneSelected ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                    boxShadow: !noneSelected ? '0 1px 4px rgba(239,68,68,0.3)' : 'none'
                  }}
                >
                  No
                </button>
              </div>
            </div>

            {/* Department Checklist */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border)',
              padding: '16px',
              borderRadius: '12px',
              opacity: noneSelected ? 0.5 : 1,
              pointerEvents: noneSelected ? 'none' : 'auto',
              transition: 'opacity 0.2s ease'
            }}>
              {allDepartments
                .filter(d => ['IT', 'Maintenance', 'QA', 'EHS', 'Admin', 'IWH', 'QC', 'Engineering', 'Legal', 'Others'].includes(d.name) && d.id !== request.department_id)
                .map(dept => {
                  const isYes = !noneSelected && selectedDepts.includes(dept.id);
                  return (
                    <div 
                      key={dept.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: isYes ? 'var(--accent-glow)' : 'var(--bg-card)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: isYes ? 'var(--accent-hover)' : 'var(--text-primary)' }}>
                        {dept.name}
                      </span>
                      <div style={{ display: 'flex', gap: 2, background: 'rgba(255, 255, 255, 0.05)', padding: 2, borderRadius: 6, border: '1px solid var(--border)' }}>
                        <button
                          type="button"
                          disabled={loading || noneSelected}
                          onClick={() => {
                            if (!isYes) {
                              setSelectedDepts([...selectedDepts, dept.id]);
                              setNoneSelected(false);
                            }
                            setDeptValidationError(null);
                          }}
                          style={{
                            padding: '3px 10px', fontSize: 11, fontWeight: 700, borderRadius: 4, cursor: 'pointer', border: 'none',
                            background: isYes ? 'var(--success)' : 'transparent',
                            color: isYes ? '#fff' : 'var(--text-muted)',
                            transition: 'all 0.15s ease',
                            boxShadow: isYes ? '0 1px 4px rgba(16,185,129,0.3)' : 'none'
                          }}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          disabled={loading || noneSelected}
                          onClick={() => {
                            if (isYes) {
                              setSelectedDepts(selectedDepts.filter(id => id !== dept.id));
                            }
                            setDeptValidationError(null);
                          }}
                          style={{
                            padding: '3px 10px', fontSize: 11, fontWeight: 700, borderRadius: 4, cursor: 'pointer', border: 'none',
                            background: !isYes ? 'var(--danger)' : 'transparent',
                            color: !isYes ? '#fff' : 'var(--text-muted)',
                            transition: 'all 0.15s ease',
                            boxShadow: !isYes ? '0 1px 4px rgba(239,68,68,0.3)' : 'none'
                          }}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
            {deptValidationError && (
              <p style={{ fontSize: 13, color: 'var(--danger)', margin: '4px 0 0', fontWeight: 500 }}>
                ⚠️ {deptValidationError}
              </p>
            )}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginBottom: 0 }}>
              HOD of each selected department (Yes) must approve this request before it can proceed to the Regional Coordinator.
            </p>
          </div>
        )}

        {isCoordinatorActingAsFinalHead && (
          <div style={{ 
            marginBottom: 20, 
            padding: '14px 16px', 
            background: 'var(--bg-base)', 
            border: '1px solid var(--border)', 
            borderRadius: 10,
            maxWidth: '500px'
          }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>
              Regional Head Availability Status
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: rhAvailability === 'available' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                <input 
                  type="radio" 
                  name="rh_availability" 
                  value="available"
                  checked={rhAvailability === 'available'} 
                  onChange={() => setRhAvailability('available')} 
                />
                <span>Regional Head Available (View Only Mode)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: rhAvailability === 'unavailable' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                <input 
                  type="radio" 
                  name="rh_availability" 
                  value="unavailable"
                  checked={rhAvailability === 'unavailable'} 
                  onChange={() => setRhAvailability('unavailable')} 
                />
                <span style={{ fontWeight: rhAvailability === 'unavailable' ? 700 : 500 }}>
                  Regional Head Not Available – Approving on Behalf of Regional Head
                </span>
              </label>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(!(isCoordinatorActingAsFinalHead && rhAvailability === 'available')) && (
            <button className="btn btn-success btn-sm" onClick={() => {
              const isInitial = request.status === 'Submitted' || request.status === 'Returned to HOD';
              if (isInitial && userRole === 'hod' && selectedDepts.length === 0 && !noneSelected) {
                setDeptValidationError('You must select at least one department, or set "None / N/A" to Yes.');
                return;
              }
              setActiveAction('approve');
              setComment('');
              setCommentError('');
            }}>
              {showSendLabel ? (
                <><Send size={15} /> Send for Approval</>
              ) : (
                <><CheckCircle2 size={15} /> Approve</>
              )}
            </button>
          )}
          {(userRole === 'final_head' || (userRole === 'regional_coordinator' && !(isCoordinatorActingAsFinalHead && rhAvailability === 'available'))) && (
            <button className="btn btn-danger btn-sm" onClick={() => { setActiveAction('reject'); setComment(''); setCommentError(''); }}>
              <XCircle size={15} /> Reject
            </button>
          )}
          <button className="btn btn-warning btn-sm" onClick={() => { setActiveAction('return'); setComment(''); setCommentError(''); }}>
            <RotateCcw size={15} /> Return for Correction
          </button>
        </div>
      </div>

      {/* Action modal */}
      <Modal
        open={!!activeAction}
        onClose={() => { 
          setActiveAction(null); 
          setError(null); 
          setSelectedDepts([]);
          setNoneSelected(!((request as any).required_reviews && (request as any).required_reviews.length > 0));
          setDeptValidationError(null);
        }}
        title={activeAction ? getActionTitleText(activeAction) : ''}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg-base)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            Request: <strong style={{ color: 'var(--text-primary)' }}>{request.id}</strong>
          </div>



          {activeAction === 'return' && RETURN_OPTIONS[returnRole] && RETURN_OPTIONS[returnRole].length > 0 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="returnTo">Return To <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select 
                id="returnTo"
                className="form-input form-select" 
                value={returnTo} 
                onChange={(e) => {
                  setReturnTo(e.target.value);
                  if (e.target.value) setReturnToError('');
                }}
                required
              >
                <option value="">— Select Recipient —</option>
                {RETURN_OPTIONS[returnRole].map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {returnToError && <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 4 }}>{returnToError}</p>}
            </div>
          )}

          {activeAction && ACTION_CONFIG[activeAction].requiresComment && (
            <Textarea
              id="action-comment"
              label={activeAction === 'reject' ? 'Reason for Rejection *' : 'Reason / Correction Required *'}
              placeholder={activeAction === 'reject'
                ? 'Explain why this request is being rejected…'
                : 'Describe what needs to be corrected or added…'}
              value={comment}
              onChange={e => { setComment(e.target.value); if (e.target.value.trim()) setCommentError(''); }}
              error={commentError}
              rows={4}
              required
            />
          )}

          {activeAction === 'approve' && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              {showSendLabel
                ? 'Sending this request for approval will notify the selected departments to review.'
                : 'Approving this request will move it to the next stage automatically.'}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setActiveAction(null)} disabled={loading}>
              Cancel
            </button>
            <button
              className={`btn ${activeAction ? ACTION_CONFIG[activeAction].btnClass : ''} btn-sm`}
              onClick={() => executeAction(activeAction)}
              disabled={loading}
            >
              {loading ? 'Processing…' : activeAction ? getActionLabelText(activeAction) : ''}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
