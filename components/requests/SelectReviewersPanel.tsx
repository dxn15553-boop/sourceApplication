'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, Square, Users, Loader2 } from 'lucide-react';

export default function SelectReviewersPanel({ 
  requestId, 
  departments 
}: { 
  requestId: string;
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleDept = (id: string) => {
    setSelectedDepts((prev: string[]) => 
      prev.includes(id) ? prev.filter((d: string) => d !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedDepts.length === 0) {
      setError('Please select at least one department for review.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/required-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentIds: selectedDepts }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign reviews');
      
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/requests/${requestId}/skip-reviews`, {
        method: 'POST',
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to skip reviews');
      
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card glass-strong" style={{ borderTop: '4px solid var(--accent)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
        <Users size={18} style={{ color: 'var(--accent)' }} /> Assign Required Reviews
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Your Head of Department has approved this request. Please select all applicable departments (EHS, Admin, QA, Legal, etc.) that need to review this request before it proceeds to the Regional Head. If no cross-functional reviews are needed, you can skip this step.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {departments.map(dept => (
          <div 
            key={dept.id}
            onClick={() => toggleDept(dept.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${selectedDepts.includes(dept.id) ? 'var(--accent)' : 'var(--border)'}`,
              background: selectedDepts.includes(dept.id) ? 'var(--accent-glow)' : 'var(--bg-card)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {selectedDepts.includes(dept.id) ? (
              <CheckSquare size={18} style={{ color: 'var(--accent)' }} />
            ) : (
              <Square size={18} style={{ color: 'var(--text-muted)' }} />
            )}
            <span style={{ fontSize: 14, fontWeight: 600, color: selectedDepts.includes(dept.id) ? 'var(--accent-hover)' : 'var(--text-primary)' }}>
              {dept.name}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, padding: '8px 12px', background: 'var(--danger-glow)', borderRadius: 6, fontWeight: 500 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button 
          onClick={handleSkip} 
          disabled={isSubmitting} 
          className="btn"
          style={{ flex: 1 }}
        >
          Skip (None Needed)
        </button>
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting || selectedDepts.length === 0} 
          className="btn btn-primary"
          style={{ flex: 2 }}
        >
          {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Assigning...</> : 'Send for Required Reviews'}
        </button>
      </div>
    </div>
  );
}
