'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, AlertCircle } from 'lucide-react';
import type { Profile, SourceRequest } from '@/lib/types';

interface AssignmentPanelProps {
  request: SourceRequest;
  availableEmployees: Profile[];
}

export default function AssignmentPanel({ request, availableEmployees }: AssignmentPanelProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (!selectedId) { setError('Please select an employee.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', assigned_employee_id: selectedId }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Assignment failed.'); return; }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      padding: 20,
      background: 'rgba(139,92,246,0.05)',
      border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: 12,
      marginTop: 20,
    }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: '#a78bfa', margin: 0 }}>
          <UserCheck size={16} style={{ display: 'inline', marginRight: 6 }} />
          Section Manager Procurement Reviews the Source Request
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Nominate the Procurement Handler. The system will automatically generate the official SRF document and notify the handler.
        </p>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 12 }}>
          <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
          <label className="form-label">Nominate the Handler</label>
          <select
            className="form-input form-select"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            disabled={loading}
          >
            <option value="">— Select Handler —</option>
            {availableEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} {(emp as any).profileDepartments?.length ? `(${(emp as any).profileDepartments.map((pd: any) => pd.department.name).join(', ')})` : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleAssign}
          disabled={loading || !selectedId}
        >
          {loading ? 'Nominating & Generating SRF…' : <><UserCheck size={15} /> Reviewed & Nominate Handler</>}
        </button>
      </div>
    </div>
  );
}
