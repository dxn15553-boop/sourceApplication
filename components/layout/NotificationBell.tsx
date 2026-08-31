'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  request_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/notifications', { signal });
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.warn('Notifications fetch warning:', err.message || err);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchNotifications(controller.signal);

    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'POST', body: JSON.stringify({}) });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const markOneAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && unreadCount > 0) {
            markAllAsRead();
          }
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          position: 'relative',
          transition: 'background 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseOut={e => e.currentTarget.style.background = 'none'}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'var(--danger)',
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px var(--bg-card)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          marginTop: 10,
          width: 340,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          zIndex: 100,
          padding: '12px 0',
          maxHeight: 400,
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 10px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No notifications
              </div>
            ) : (
              notifications.map(n => (
                <Link
                  key={n.id}
                  href={`/requests/${n.request_id}`}
                  onClick={() => {
                    markOneAsRead(n.id);
                    setOpen(false);
                  }}
                  style={{
                    display: 'flex', gap: 10,
                    padding: '12px 16px',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--border)',
                    background: n.is_read ? 'transparent' : 'rgba(99,102,241,0.03)',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseOut={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(99,102,241,0.03)'}
                >
                  <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12.5, fontWeight: n.is_read ? 500 : 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                      {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
