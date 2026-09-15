'use client';

import { useState, useEffect } from 'react';
import { Bell, X, ArrowRight } from 'lucide-react';

export interface ToastNotificationData {
  id: string;
  requestId: string;
  title: string;
  message: string;
  priority?: string | null;
  createdAt: string;
}

interface NotificationToastProps {
  notification: ToastNotificationData | null;
  onDismiss: () => void;
  onOpen: (id: string, requestId: string) => void;
}

export default function NotificationToast({
  notification,
  onDismiss,
  onOpen,
}: NotificationToastProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) return;

    const duration = 8000; // 8 seconds
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      if (!isHovered) {
        setProgress(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            onDismiss();
            return 0;
          }
          return prev - step;
        });
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [notification, isHovered, onDismiss]);

  if (!notification) return null;

  const priority = notification.priority?.toUpperCase();
  const isUrgent = priority === 'URGENT' || priority === 'CRITICAL';
  const isImportant = priority === 'IMPORTANT';

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 99999,
        width: 380,
        maxWidth: 'calc(100vw - 32px)',
        background: 'var(--bg-card, #1e293b)',
        color: 'var(--text-primary, #f8fafc)',
        borderRadius: 14,
        border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
        boxShadow: isUrgent
          ? '0 20px 40px -12px rgba(239, 68, 68, 0.35), 0 0 0 1px rgba(239, 68, 68, 0.4)'
          : '0 20px 40px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.3)',
        overflow: 'hidden',
        animation: 'slideInToast 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <style>{`
        @keyframes slideInToast {
          from {
            transform: translateX(110%) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes bellPulse {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-15deg); }
          60% { transform: rotate(10deg); }
          80% { transform: rotate(-5deg); }
        }
      `}</style>

      <div style={{ padding: '16px 18px 14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                color: isUrgent ? '#ef4444' : '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bell size={18} style={{ animation: 'bellPulse 1s ease-in-out 2' }} />
            </div>

            <div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: isUrgent ? '#f87171' : '#818cf8',
                }}
              >
                Immediate Alert
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                  {notification.requestId}
                </span>
                {priority && (
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: isUrgent
                        ? '#ef4444'
                        : isImportant
                        ? '#f59e0b'
                        : '#3b82f6',
                      color: '#ffffff',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {priority}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.color = 'var(--text-muted, #94a3b8)';
              e.currentTarget.style.background = 'none';
            }}
            aria-label="Dismiss alert"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message body */}
        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.45,
            color: 'var(--text-secondary, #cbd5e1)',
            margin: '0 0 12px 0',
            wordBreak: 'break-word',
          }}
        >
          {notification.message}
        </p>

        {/* Action button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: '1px solid var(--border, rgba(255,255,255,0.15))',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: 11.5,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
          >
            Later
          </button>

          <button
            onClick={() => onOpen(notification.id, notification.requestId)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: isUrgent
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: isUrgent
                ? '0 4px 12px rgba(239, 68, 68, 0.4)'
                : '0 4px 12px rgba(99, 102, 241, 0.4)',
              transition: 'transform 0.1s, opacity 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.92')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            <span>Review Request</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Shrinking progress bar indicating auto-dismiss */}
      <div
        style={{
          height: 3,
          width: '100%',
          background: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: isUrgent ? '#ef4444' : '#6366f1',
            transition: isHovered ? 'none' : 'width 0.05s linear',
          }}
        />
      </div>
    </div>
  );
}
