'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Clock, Check, X, FileText } from 'lucide-react';

interface ReviewItem {
  id: string;
  department_id?: string;
  status: string;
  remarks?: string | null;
  department?: { id?: string; name: string } | null;
  reviewer?: { id?: string; full_name?: string } | null;
  attachment_name?: string | null;
  attachment_path?: string | null;
  created_at?: string | Date | null;
}

interface UserDepartmentReviewsSummaryProps {
  reviews?: ReviewItem[] | null;
  className?: string;
}

export default function UserDepartmentReviewsSummary({ reviews, className = '' }: UserDepartmentReviewsSummaryProps) {
  if (!reviews || reviews.length === 0) return null;

  // Deduplicate by department_id to show only the latest review per department
  const latestMap: Record<string, ReviewItem> = {};
  reviews.forEach((r) => {
    const key = r.department_id || r.department?.id || r.id;
    const existing = latestMap[key];
    if (!existing || new Date(r.created_at || 0) > new Date(existing.created_at || 0)) {
      latestMap[key] = r;
    }
  });

  const latestReviews = Object.values(latestMap);
  if (latestReviews.length === 0) return null;

  const allApproved = latestReviews.every((r) => r.status === 'Approved');
  const anyReturned = latestReviews.some((r) => r.status === 'Returned' || r.status === 'Rejected');
  const approvedCount = latestReviews.filter((r) => r.status === 'Approved').length;
  const totalCount = latestReviews.length;

  return (
    <div
      className={`user-dept-reviews-box ${className}`}
      style={{
        marginTop: 10,
        padding: '9px 12px',
        borderRadius: 8,
        background: allApproved
          ? 'rgba(16, 185, 129, 0.06)'
          : anyReturned
          ? 'rgba(245, 158, 11, 0.07)'
          : 'rgba(59, 130, 246, 0.05)',
        border: `1px solid ${
          allApproved
            ? 'rgba(16, 185, 129, 0.22)'
            : anyReturned
            ? 'rgba(245, 158, 11, 0.28)'
            : 'rgba(59, 130, 246, 0.20)'
        }`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Title & Status Summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700 }}>
          {allApproved ? (
            <>
              <CheckCircle2 size={14} style={{ color: '#059669', flexShrink: 0 }} />
              <span style={{ color: '#047857' }}>
                All User Department Reviews Approved ({approvedCount}/{totalCount})
              </span>
            </>
          ) : anyReturned ? (
            <>
              <AlertCircle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
              <span style={{ color: '#b45309' }}>
                User Department Review Returned ({approvedCount}/{totalCount} approved)
              </span>
            </>
          ) : (
            <>
              <Clock size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
              <span style={{ color: '#1d4ed8' }}>
                User Department Reviews in Progress ({approvedCount}/{totalCount} completed)
              </span>
            </>
          )}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Review Results
        </span>
      </div>

      {/* Department Review Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {latestReviews.map((r) => {
          const isApproved = r.status === 'Approved';
          const isReturned = r.status === 'Returned' || r.status === 'Rejected';
          const deptName = r.department?.name || 'Department';

          return (
            <div
              key={r.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 6,
                background: isApproved
                  ? 'rgba(16, 185, 129, 0.12)'
                  : isReturned
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(241, 245, 249, 0.9)',
                border: `1px solid ${
                  isApproved
                    ? 'rgba(16, 185, 129, 0.28)'
                    : isReturned
                    ? 'rgba(245, 158, 11, 0.32)'
                    : 'rgba(203, 213, 225, 0.8)'
                }`,
                color: isApproved
                  ? '#065f46'
                  : isReturned
                  ? '#92400e'
                  : 'var(--text-secondary)',
              }}
            >
              <span style={{ fontWeight: 700 }}>{deptName}:</span>
              <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {isApproved ? (
                  <>
                    <Check size={11} strokeWidth={2.5} style={{ color: '#059669' }} /> Approved
                  </>
                ) : isReturned ? (
                  <>
                    <X size={11} strokeWidth={2.5} style={{ color: '#d97706' }} /> Returned
                  </>
                ) : (
                  <>
                    <Clock size={11} strokeWidth={2} style={{ color: '#2563eb' }} /> Pending
                  </>
                )}
              </span>
              {r.reviewer?.full_name && (
                <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>
                  · {r.reviewer.full_name}
                </span>
              )}
              {r.remarks && (
                <span
                  style={{
                    fontStyle: 'italic',
                    color: isReturned ? '#b45309' : 'var(--text-secondary)',
                    fontSize: 10.5,
                    maxWidth: 240,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginLeft: 2,
                  }}
                  title={r.remarks}
                >
                  &ldquo;{r.remarks}&rdquo;
                </span>
              )}
              {r.attachment_name && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: 10,
                    color: '#2563eb',
                    marginLeft: 2,
                  }}
                  title={`Attachment: ${r.attachment_name}`}
                >
                  <FileText size={10} />
                  <span>File</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
