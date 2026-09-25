'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import { CheckCircle2, XCircle, RotateCcw, AlertCircle, Send, Ban } from 'lucide-react';
import type { SourceRequest } from '@/lib/types';
import { getHodOrFpicLabel } from '@/lib/workflow';

interface ApprovalPanelProps {
  request: SourceRequest;
  userRole: string;
  allDepartments?: {
    id: string;
    name: string;
    hasHod?: boolean;
    hodName?: string | null;
    hodEmail?: string | null;
  }[];
}

type ActionType = 'approve' | 'reject' | 'return' | 'cancel' | null;

const ACTION_CONFIG = {
  approve: { label: 'Approve',        icon: <CheckCircle2 size={15} />, btnClass: 'btn-success', title: 'Confirm Approval',             requiresComment: false },
  reject:  { label: 'Reject',         icon: <XCircle size={15} />,      btnClass: 'btn-danger',  title: 'Reject Request',               requiresComment: true  },
  return:  { label: 'Return',         icon: <RotateCcw size={15} />,    btnClass: 'btn-warning', title: 'Return for Correction',        requiresComment: true  },
  cancel:  { label: 'Cancel Request', icon: <Ban size={15} />,          btnClass: 'btn-danger',  title: 'Cancel Source Request',        requiresComment: true  },
};

function getReturnOptions(headLabel: string): Record<string, { label: string, value: string }[]> {
  return {
    procurement_manager: [
      { label: 'Regional Head (1 step back)', value: 'final_head' },
      { label: 'Regional Coordinator (2 steps back)', value: 'regional_coordinator' },
      { label: `${headLabel} (3 steps back)`, value: 'hod' },
      { label: 'Requester (Start over)', value: 'user' },
    ],
    final_head: [
      { label: 'Regional Coordinator (1 step back)', value: 'regional_coordinator' },
      { label: `${headLabel} (2 steps back)`, value: 'hod' },
      { label: 'Requester (Start over)', value: 'user' },
    ],
    regional_coordinator: [
      { label: `${headLabel} (1 step back)`, value: 'hod' },
      { label: 'Requester (Start over)', value: 'user' },
    ],
    hod: [
      { label: 'Requester', value: 'user' }
    ]
  };
}

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
  const [noneSelected, setNoneSelected] = useState(false);
  const [deptValidationError, setDeptValidationError] = useState<string | null>(null);
  const [rhAvailability, setRhAvailability] = useState<'available' | 'unavailable'>('available');

  const selectedDepartmentsWithNoHod = (allDepartments || []).filter(
    d => selectedDepts.includes(d.id) && d.hasHod === false
  );

  const isRHStage = request.status === 'Final Head Review' || request.status === 'Returned to Regional Head';
  const isInitialDeptSelection = userRole === 'regional_coordinator' && 
    ['Regional Coordinator Review', 'HOD Approved', 'Returned to Regional Coordinator'].includes(request.status);
  const isTargetDeptApproved = userRole === 'regional_coordinator' && request.status === 'Target Dept Approved';
  const showSendLabel = isInitialDeptSelection && !noneSelected && selectedDepts.length > 0;

  const isCoordinatorActingAsFinalHead = userRole === 'regional_coordinator' && isRHStage && rhAvailability === 'unavailable';
  const isRegionalHead = userRole === 'final_head' || isCoordinatorActingAsFinalHead;
  const returnRole = isCoordinatorActingAsFinalHead ? 'final_head' : userRole;

  const getActionLabelText = (act: ActionType) => {
    if (!act) return '';
    if (act === 'approve') {
      if (showSendLabel) return 'Send to User Departments';
      if (isTargetDeptApproved) return 'Forward to Regional Head';
      if (isCoordinatorActingAsFinalHead) return 'Approve on Behalf of Regional Head';
      if (userRole === 'final_head') return 'Approve';
      if (userRole === 'regional_coordinator') return 'Accept & Forward to Regional Head';
      return 'Accept';
    }
    return ACTION_CONFIG[act].label;
  };

  const getActionTitleText = (act: ActionType) => {
    if (!act) return '';
    if (act === 'approve') {
      if (showSendLabel) return 'Send to User Departments';
      if (isTargetDeptApproved) return 'Forward to Regional Head';
      if (isCoordinatorActingAsFinalHead) return 'Confirm Approval on Behalf of Regional Head';
      if (userRole === 'final_head') return 'Confirm Approval';
      if (userRole === 'regional_coordinator') return 'Confirm Acceptance & Forward';
      return 'Confirm Acceptance';
    }
    return ACTION_CONFIG[act].title;
  };

  const showActions = userRole !== 'regional_coordinator' || !isRHStage || rhAvailability === 'unavailable';

  const deptName = request.department?.name || (request as any).requester_department?.name;
  const headLabel = getHodOrFpicLabel(deptName, false);
  const headFullLabel = getHodOrFpicLabel(deptName, true);
  const returnOptions = getReturnOptions(headFullLabel);

  async function executeAction(action: ActionType) {
    if (!action || loading) return;
    const cfg = ACTION_CONFIG[action];

    if (cfg.requiresComment && !comment.trim()) {
      setCommentError(action === 'cancel' ? 'Please provide a reason for cancellation.' : 'Please provide a reason or comment.');
      return;
    }



    if (activeAction === 'return') {
      const options = returnOptions[returnRole] || [];
      if (options.length > 0 && !returnTo) {
        setReturnToError('Please select who to return the request to.');
        return;
      }
    }

    if (activeAction === 'approve' && isInitialDeptSelection) {
      if (selectedDepts.length === 0 && !noneSelected) {
        setDeptValidationError("Please select User Department(s) or select 'None / N/A' if no department review is required.");
        return;
      }

      if (!noneSelected && selectedDepartmentsWithNoHod.length > 0) {
        const names = selectedDepartmentsWithNoHod.map(d => d.name).join(', ');
        const warning = `No login found for the selected department(s): ${names}. The request cannot be sent. Please create the department login first.`;
        setDeptValidationError(warning);
        setError(warning);
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

      const rejectedDepts = Object.values(latestReviews).filter((r: any) => r.status === 'Returned' || r.status === 'Rejected');
      const rejectedDeptIds = rejectedDepts.map((r: any) => r.department_id);

      // Verify if coordinator has selected "Yes" for all previously returned departments
      const missingApprovals = rejectedDeptIds.filter(id => !selectedDepts.includes(id));
      if (missingApprovals.length > 0) {
        const missingNames = missingApprovals.map(id => {
          const dept = allDepartments?.find(d => d.id === id);
          return dept ? dept.name : 'Unknown';
        }).join(', ');
        
        setDeptValidationError(`Cannot forward. You must select 'Yes' for the department(s) that previously returned the request: ${missingNames}.`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const payload: any = { 
        action, 
        comment: comment.trim() || undefined, 
        return_to: returnTo || undefined 
      };
      if (userRole === 'regional_coordinator') {
        if (isInitialDeptSelection) {
          payload.department_ids = noneSelected ? [] : selectedDepts;
          payload.none_selected = noneSelected;
        }
        if (isRHStage) {
          payload.rh_availability = rhAvailability;
        }
      }

      const res = await fetch(`/api/requests/${request.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error && json.error.includes('not valid in status')) {
          setActiveAction(null);
          window.location.reload();
          return;
        }
        setError(json.error ?? 'Action failed.');
        return;
      }

      setActiveAction(null);
      window.location.reload();
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

        {/* Notice if request was returned to HOD */}
        {request.status === 'Returned to HOD' && userRole === 'hod' && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 16px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 8,
            marginBottom: 16
          }}>
            <RotateCcw size={16} style={{ color: '#fbbf24', marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>
                Request Returned to {headLabel}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                This request was returned. Please review the return remarks. You can accept and forward it again, return it to the requester, or cancel the request.
              </p>
            </div>
          </div>
        )}

        {/* Notice if request was returned to Regional Coordinator */}
        {request.status === 'Returned to Regional Coordinator' && userRole === 'regional_coordinator' && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 16px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 8,
            marginBottom: 16
          }}>
            <RotateCcw size={16} style={{ color: '#fbbf24', marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>
                Request Returned to Regional Coordinator
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                A User Department has returned this request. If the return reason indicates that this request is no longer required, you can click <strong>Cancel Request</strong> below to cancel it. Otherwise, you can adjust the departments and send it forward again or return it to the {headLabel}.
              </p>
            </div>
          </div>
        )}

        {/* Notice if all User Department reviews are completed and approved */}
        {isTargetDeptApproved && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '14px 16px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 8,
            marginBottom: 20
          }}>
            <CheckCircle2 size={18} style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#10b981' }}>
                User Department Reviews Completed
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                All required User Department reviews have been completed and approved. Click <strong>Forward to Regional Head</strong> below to send this request for final review.
              </p>
            </div>
          </div>
        )}

        {/* User Department checklist (Yes/No buttons) - only shown during initial selection or when returned */}
        {isInitialDeptSelection && allDepartments && (
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
              User Department <span style={{ color: 'var(--danger)' }}>*</span>
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
              marginBottom: 4,
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                None / N/A (No additional user departments needed)
              </span>
              <div style={{ display: 'flex', gap: 2, background: 'rgba(255, 255, 255, 0.05)', padding: 2, borderRadius: 6, border: '1px solid var(--border)', flexShrink: 0 }}>
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
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
                  const hasLogin = dept.hasHod !== false;
                  return (
                    <div 
                      key={dept.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: `1px solid ${!hasLogin && isYes ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
                        background: isYes 
                          ? (!hasLogin ? 'rgba(239,68,68,0.08)' : 'var(--accent-glow)') 
                          : 'var(--bg-card)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: isYes ? (hasLogin ? 'var(--accent-hover)' : '#f87171') : 'var(--text-primary)' }}>
                          {dept.name}
                        </span>
                        {!hasLogin && (
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: '#f87171' }}>
                            No login configured
                          </span>
                        )}
                      </div>
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
                            background: isYes ? (hasLogin ? 'var(--success)' : 'var(--danger)') : 'transparent',
                            color: isYes ? '#fff' : 'var(--text-muted)',
                            transition: 'all 0.15s ease',
                            boxShadow: isYes ? (hasLogin ? '0 1px 4px rgba(16,185,129,0.3)' : '0 1px 4px rgba(239,68,68,0.3)') : 'none'
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
                            background: !isYes ? 'rgba(255,255,255,0.08)' : 'transparent',
                            color: !isYes ? 'var(--text-secondary)' : 'var(--text-muted)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
            {selectedDepartmentsWithNoHod.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                marginTop: 4
              }}>
                <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>
                  ⚠️ No login found for the selected department(s): {selectedDepartmentsWithNoHod.map(d => d.name).join(', ')}. The request cannot be sent. Please create the department login first.
                </p>
              </div>
            )}
            {deptValidationError && (
              <p style={{ fontSize: 13, color: 'var(--danger)', margin: '4px 0 0', fontWeight: 500 }}>
                ⚠️ {deptValidationError}
              </p>
            )}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginBottom: 0 }}>
              HOD of each selected User Department (Yes) must approve this request before it can proceed to the Regional Head.
            </p>
          </div>
        )}

        {userRole === 'regional_coordinator' && isRHStage && (
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
                <span style={{ fontWeight: rhAvailability === 'unavailable' ? 700 : 500, color: rhAvailability === 'unavailable' ? '#fbbf24' : 'var(--text-secondary)' }}>
                  Regional Head Not Available – Approving on Behalf of Regional Head
                </span>
              </label>
            </div>
            {rhAvailability === 'available' && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '10px 0 0' }}>
                ℹ️ The request is currently awaiting review by the Regional Head. If the Regional Head is unavailable, select the option above to take action on their behalf.
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {showActions && (
            <button className="btn btn-success btn-sm" onClick={() => {
              if (isInitialDeptSelection) {
                if (selectedDepts.length === 0 && !noneSelected) {
                  setDeptValidationError("Please select User Department(s) or select 'None / N/A' if no department review is required.");
                  return;
                }
                if (!noneSelected && selectedDepartmentsWithNoHod.length > 0) {
                  const names = selectedDepartmentsWithNoHod.map(d => d.name).join(', ');
                  setDeptValidationError(`No login found for the selected department(s): ${names}. The request cannot be sent. Please create the department login first.`);
                  return;
                }
              }
              setActiveAction('approve');
              setComment('');
              setCommentError('');
              setError(null);
            }}>
              {showSendLabel ? (
                <><Send size={15} /> Send to User Departments</>
              ) : isTargetDeptApproved ? (
                <><Send size={15} /> Forward to Regional Head</>
              ) : isCoordinatorActingAsFinalHead ? (
                <><CheckCircle2 size={15} /> Approve on Behalf of Regional Head</>
              ) : userRole === 'final_head' ? (
                <><CheckCircle2 size={15} /> Approve</>
              ) : userRole === 'regional_coordinator' ? (
                <><CheckCircle2 size={15} /> Accept & Forward to Regional Head</>
              ) : (
                <><CheckCircle2 size={15} /> Accept</>
              )}
            </button>
          )}
          {(userRole === 'procurement_manager' || userRole === 'final_head' || (userRole === 'regional_coordinator' && showActions)) && (
            <button className="btn btn-danger btn-sm" onClick={() => { setActiveAction('reject'); setComment(''); setCommentError(''); setError(null); }}>
              <XCircle size={15} /> Reject
            </button>
          )}
          {showActions && (
            <button className="btn btn-warning btn-sm" onClick={() => { setActiveAction('return'); setComment(''); setCommentError(''); setError(null); }}>
              <RotateCcw size={15} /> Return for Correction
            </button>
          )}
          {(userRole === 'hod' || userRole === 'regional_coordinator') && showActions && (
            <button 
              className="btn btn-danger btn-sm" 
              onClick={() => { setActiveAction('cancel'); setComment(''); setCommentError(''); setError(null); }}
            >
              <Ban size={15} /> Cancel Request
            </button>
          )}
        </div>
      </div>

      {/* Action modal */}
      <Modal
        open={!!activeAction}
        onClose={() => { 
          setActiveAction(null); 
          setError(null); 
          setSelectedDepts([]);
          setNoneSelected(false);
          setDeptValidationError(null);
        }}
        title={activeAction ? getActionTitleText(activeAction) : ''}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 8 }}>
              <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#fca5a5', margin: 0, fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <div style={{ padding: '12px 16px', background: 'var(--bg-base)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            Request: <strong style={{ color: 'var(--text-primary)' }}>{request.id}</strong>
          </div>



          {activeAction === 'return' && returnOptions[returnRole] && returnOptions[returnRole].length > 0 && (
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
                {returnOptions[returnRole]?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {returnToError && <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 4 }}>{returnToError}</p>}
            </div>
          )}

          {activeAction === 'cancel' && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 8, fontSize: 13, color: '#fca5a5' }}>
              ⚠️ Are you sure you want to cancel this request? This will terminate the request workflow.
            </div>
          )}

          {activeAction && ACTION_CONFIG[activeAction].requiresComment && (
            <Textarea
              id="action-comment"
              label={activeAction === 'reject' ? 'Reason for Rejection *' : activeAction === 'cancel' ? 'Reason for Cancellation *' : 'Reason / Correction Required *'}
              placeholder={activeAction === 'reject'
                ? 'Explain why this request is being rejected…'
                : activeAction === 'cancel'
                ? 'Explain why this request is being cancelled…'
                : 'Describe what needs to be corrected or added…'}
              value={comment}
              onChange={e => { setComment(e.target.value); if (e.target.value.trim()) setCommentError(''); }}
              error={commentError}
              rows={4}
              required
            />
          )}

          {activeAction === 'approve' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                {showSendLabel
                  ? 'Sending this request for review will notify the selected departments to review.'
                  : isTargetDeptApproved
                  ? 'Forwarding this request will submit it to the Regional Head for final review.'
                  : isCoordinatorActingAsFinalHead
                  ? 'Approving this request on behalf of the Regional Head will move it to the Procurement stage.'
                  : userRole === 'final_head'
                  ? 'Approving this request will move it to the Procurement Manager for review.'
                  : userRole === 'regional_coordinator'
                  ? 'Approving this request will move it to the next stage automatically.'
                  : 'Accepting this request will move it to the next stage automatically.'}
              </p>

              <div style={{ marginTop: 8 }}>
                <Textarea
                  id="approval-comment"
                  label="Comments / Remarks (Optional)"
                  placeholder={isRegionalHead || userRole === 'regional_coordinator' ? "Add any comments or notes for this approval (optional)…" : "Add any comments or notes for this acceptance (optional)…"}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                />
              </div>
            </>
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
