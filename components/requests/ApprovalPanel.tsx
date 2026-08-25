'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import { CheckCircle2, XCircle, RotateCcw, AlertCircle } from 'lucide-react';
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
    { label: 'Head of Department (2 steps back)', value: 'hod' },
    { label: 'Requester (Start over)', value: 'user' },
  ],
  final_head: [
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

  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [noneSelected, setNoneSelected] = useState(false);
  const [deptValidationError, setDeptValidationError] = useState<string | null>(null);

  async function executeAction(action: ActionType) {
    if (!action) return;
    const cfg = ACTION_CONFIG[action];

    if (cfg.requiresComment && !comment.trim()) {
      setCommentError('Please provide a reason or comment.');
      return;
    }



    if (activeAction === 'return') {
      const options = RETURN_OPTIONS[userRole] || [];
      if (options.length > 0 && !returnTo) {
        setReturnToError('Please select who to return the request to.');
        return;
      }
    }

    if (activeAction === 'approve' && userRole === 'hod') {
      if (selectedDepts.length === 0 && !noneSelected) {
        setDeptValidationError('Please select at least one permission requirement.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const payload: any = { action, comment: comment.trim() || undefined, return_to: returnTo || undefined };
      if (userRole === 'hod') {
        payload.department_ids = noneSelected ? [] : selectedDepts;
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

        {/* Permission Required From checklist (visible directly on the page for HODs) */}
        {userRole === 'hod' && allDepartments && (
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Permission Required From <span style={{ color: 'var(--danger)' }}>*</span>
            </label>

            {/* None / N/A option */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '13px', 
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              userSelect: 'none',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              maxWidth: '340px'
            }}>
              <input
                type="checkbox"
                checked={noneSelected}
                onChange={(e) => {
                  setNoneSelected(e.target.checked);
                  if (e.target.checked) {
                    setSelectedDepts([]);
                  }
                  setDeptValidationError(null);
                }}
                disabled={loading}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              <span>None / N/A (No additional permissions needed)</span>
            </label>

            {/* Department checkboxes */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '10px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--border)',
              padding: '16px',
              borderRadius: '12px',
              opacity: noneSelected ? 0.6 : 1,
              pointerEvents: noneSelected ? 'none' : 'auto'
            }}>
              {allDepartments
                .filter(d => ['IT', 'Maintenance', 'QA', 'EHS', 'Admin', 'IWH', 'QC', 'Engineering', 'Legal', 'Others'].includes(d.name) && d.id !== request.department_id)
                .map(dept => {
                  const isChecked = selectedDepts.includes(dept.id);
                  return (
                    <label 
                      key={dept.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: '13px', 
                        color: noneSelected ? 'var(--text-muted)' : 'var(--text-secondary)',
                        cursor: noneSelected ? 'not-allowed' : 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={loading || noneSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDepts([...selectedDepts, dept.id]);
                            setNoneSelected(false);
                          } else {
                            setSelectedDepts(selectedDepts.filter(id => id !== dept.id));
                          }
                          setDeptValidationError(null);
                        }}
                        style={{
                          width: '15px',
                          height: '15px',
                          cursor: noneSelected ? 'not-allowed' : 'pointer',
                          accentColor: 'var(--accent)'
                        }}
                      />
                      <span>{dept.name}</span>
                    </label>
                  );
                })}
            </div>
            {deptValidationError && (
              <p style={{ fontSize: 13, color: 'var(--danger)', margin: '4px 0 0', fontWeight: 500 }}>
                ⚠️ {deptValidationError}
              </p>
            )}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginBottom: 0 }}>
              HOD of each selected department must approve this request before it can proceed to the Regional Head.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-success btn-sm" onClick={() => {
            if (userRole === 'hod' && selectedDepts.length === 0 && !noneSelected) {
              setDeptValidationError('Please select at least one permission requirement.');
              return;
            }
            setActiveAction('approve');
            setComment('');
            setCommentError('');
          }}>
            <CheckCircle2 size={15} /> Approve
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => { setActiveAction('reject'); setComment(''); setCommentError(''); }}>
            <XCircle size={15} /> Reject
          </button>
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
          setNoneSelected(false);
          setDeptValidationError(null);
        }}
        title={activeAction ? ACTION_CONFIG[activeAction].title : ''}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg-base)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            Request: <strong style={{ color: 'var(--text-primary)' }}>{request.id}</strong>
          </div>



          {activeAction === 'return' && RETURN_OPTIONS[userRole] && RETURN_OPTIONS[userRole].length > 0 && (
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
                {RETURN_OPTIONS[userRole].map((opt) => (
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
              Approving this request will move it to the next stage automatically.
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
              {loading ? 'Processing…' : activeAction ? ACTION_CONFIG[activeAction].label : ''}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
