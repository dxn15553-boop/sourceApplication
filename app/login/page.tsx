'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileStack, Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck, Zap, Globe, CheckCircle2 } from 'lucide-react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn('credentials', { redirect: false, email, password });
      if (res?.error) { 
        setError('Incorrect Login ID or Password. Please try again.'); 
        return; 
      }
      
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* LEFT PANEL */}
      <div style={{
        flex: '0 0 48%',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #0f0c29 0%, #1a1258 55%, #24243e 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        minHeight: '100vh',
      }} className="login-left-panel">

        {/* Floating orbs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '70%', height: '70%', background: 'radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 65%)', filter: 'blur(60px)', animation: 'orb1 18s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: '-20%', right: '-15%', width: '75%', height: '75%', background: 'radial-gradient(circle, rgba(14,165,233,0.35) 0%, transparent 65%)', filter: 'blur(70px)', animation: 'orb2 22s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', top: '35%', left: '20%', width: '55%', height: '55%', background: 'radial-gradient(circle, rgba(217,70,239,0.2) 0%, transparent 65%)', filter: 'blur(80px)', animation: 'orb3 15s ease-in-out infinite alternate' }} />
        </div>

        {/* Grid lines */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Decorative circles */}
        <svg style={{ position: 'absolute', bottom: 0, right: 0, opacity: 0.08, pointerEvents: 'none' }} width="400" height="400" viewBox="0 0 400 400" fill="none">
          <circle cx="400" cy="400" r="350" stroke="white" strokeWidth="1.5" />
          <circle cx="400" cy="400" r="250" stroke="white" strokeWidth="1.5" />
          <circle cx="400" cy="400" r="140" stroke="white" strokeWidth="1.5" />
        </svg>

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '8px 16px 8px 8px', backdropFilter: 'blur(12px)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileStack size={18} color="#fff" />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>DXN Procurement</span>
          </div>
        </div>

        {/* Main copy */}
        <div style={{ position: 'relative', zIndex: 2, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '5px 14px', marginBottom: 28 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ color: '#6ee7b7', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>System Online</span>
          </div>

          <h1 style={{ color: '#fff', fontSize: 42, fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 18 }}>
            Source Request<br />
            <span style={{ background: 'linear-gradient(90deg, #818cf8, #38bdf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Management
            </span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.8, maxWidth: 340, marginBottom: 44 }}>
            A centralised platform for procurement requests, approvals, and supplier sourcing across all DXN departments.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            {[
              { icon: <ShieldCheck size={14} />, label: 'Role-based access control' },
              { icon: <Zap size={14} />, label: 'Real-time workflow tracking' },
              { icon: <Globe size={14} />, label: 'Multi-department support' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>{f.icon}</div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ position: 'relative', zIndex: 2, color: 'rgba(255,255,255,0.18)', fontSize: 11, flexShrink: 0 }}>
          &copy; 2026 DXN Holdings Berhad &middot; All rights reserved
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        padding: '60px 48px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
      }}>

        {/* Right panel ambient orbs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 65%)', filter: 'blur(80px)', animation: 'orb2 20s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '55%', height: '55%', background: 'radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 65%)', filter: 'blur(80px)', animation: 'orb1 24s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', top: '40%', right: '30%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(217,70,239,0.12) 0%, transparent 65%)', filter: 'blur(70px)', animation: 'orb3 16s ease-in-out infinite alternate' }} />
        </div>

        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

        {/* Decorative arc top-left */}
        <svg style={{ position: 'absolute', top: -60, left: -60, opacity: 0.07, pointerEvents: 'none' }} width="320" height="320" viewBox="0 0 320 320" fill="none">
          <circle cx="0" cy="0" r="280" stroke="white" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="200" stroke="white" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="120" stroke="white" strokeWidth="1.5" />
        </svg>

        {/* Glass login card */}
        <div style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 28,
          padding: '52px 44px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          position: 'relative',
          zIndex: 1,
          animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        }}>

          {/* Top shimmer line on card */}
          <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.7), rgba(56,189,248,0.7), transparent)', borderRadius: 1 }} />

          {/* Card header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(14,165,233,0.2))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Lock size={20} color="#818cf8" />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.25, margin: '0 0 8px 0' }}>
              Welcome back 👋
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>
              Sign in to access your dashboard and manage requests.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 16px', marginBottom: 24,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 12,
              animation: 'fadeUp 0.3s ease forwards',
            }}>
              <AlertCircle size={15} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#fca5a5', margin: 0, lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email / Login ID */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="email" style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Login ID / Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                <input
                  id="email"
                  type="text"
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '13px 14px 13px 42px',
                    borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit',
                  }}
                  placeholder="e.g. requester@dxn.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="password" style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '13px 46px 13px 42px',
                    borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit',
                  }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: 6 }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                width: '100%',
                padding: '15px 24px',
                borderRadius: 12,
                background: loading
                  ? 'rgba(99,102,241,0.5)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #4338ca 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: loading ? 'none' : '0 8px 24px rgba(99,102,241,0.4)',
                transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                letterSpacing: '-0.01em',
                fontFamily: 'inherit',
              }}
            >
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                  Signing in&hellip;
                </>
              ) : 'Sign In \u2192'}
            </button>
          </form>

          {/* Trust badges */}
          <div style={{ marginTop: 32, display: 'flex', gap: 10 }}>
            {[
              { icon: <ShieldCheck size={12} />, label: 'Secure login' },
              { icon: <CheckCircle2 size={12} />, label: 'SSL encrypted' },
              { icon: <Zap size={12} />, label: 'Fast & reliable' },
            ].map(b => (
              <div key={b.label} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                <span style={{ color: '#818cf8' }}>{b.icon}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500, whiteSpace: 'nowrap' }}>{b.label}</span>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <p style={{ marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6, textAlign: 'center', margin: '24px 0 0 0' }}>
            Need access?{' '}
            <span style={{ color: '#818cf8', fontWeight: 600 }}>Contact your system administrator</span>
            {' '}to get your account set up.
          </p>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes orb1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(6%, 12%) scale(1.12); }
        }
        @keyframes orb2 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-8%, -14%) scale(1.08); }
        }
        @keyframes orb3 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(10%, -6%) scale(1.18); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
