'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import RequestDescriptionInput from '@/components/requests/RequestDescriptionInput';
import FileUpload, { ExistingAttachment } from '@/components/ui/FileUpload';
import { Save, AlertCircle } from 'lucide-react';
import type { SourceRequest } from '@/lib/types';

interface EditRequestModalProps {
  open: boolean;
  onClose: () => void;
  request: SourceRequest;
  onSaved: () => void;
}

export default function EditRequestModal({ open, onClose, request, onSaved }: EditRequestModalProps) {
  const [requesterName, setRequesterName] = useState(request.requester_name || '');
  const [requesterDesignation, setRequesterDesignation] = useState(request.requester_designation || '');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>(
    (request.priority as any) || 'Medium'
  );
  const [requiredByDate, setRequiredByDate] = useState(
    request.required_by_date ? new Date(request.required_by_date).toISOString().split('T')[0] : ''
  );
  const [purposeJustification, setPurposeJustification] = useState(request.purpose_justification || '');
  const [description, setDescription] = useState(request.description || '');
  const initialExisting: ExistingAttachment[] = (() => {
    if (request.attachments) {
      try {
        const parsed = typeof request.attachments === 'string' ? JSON.parse(request.attachments) : request.attachments;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    if (request.attachment_path && request.attachment_name) {
      return [{ name: request.attachment_name, path: request.attachment_path }];
    }
    return [];
  })();

  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>(initialExisting);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemoveExisting = (index: number) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!requesterName.trim()) {
      setError('Please enter requester name.');
      return;
    }

    if (!requesterDesignation.trim()) {
      setError('Please enter designation.');
      return;
    }

    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    const requiresUrs = description.toLowerCase().includes('machinery');
    const totalAttachmentsCount = existingAttachments.length + newFiles.length;
    if (requiresUrs && totalAttachmentsCount === 0) {
      setError('A URS (User Requirement Specification) document is mandatory when requesting New Machinery Purchase. Please attach the document.');
      return;
    }

    setLoading(true);
    try {
      let newlyUploaded: ExistingAttachment[] = [];

      if (newFiles.length > 0) {
        const formData = new FormData();
        newFiles.forEach((f) => formData.append('files', f));
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadJson.error ?? 'File upload failed.');
          return;
        }
        newlyUploaded = uploadJson.files || [];
      }

      const allAttachments = [...existingAttachments, ...newlyUploaded];

      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_name: requesterName.trim(),
          requester_designation: requesterDesignation.trim(),
          priority,
          required_by_date: requiredByDate || null,
          purpose_justification: purposeJustification.trim() || null,
          description: description.trim(),
          attachment_path: allAttachments[0]?.path ?? null,
          attachment_name: allAttachments[0]?.name ?? null,
          attachments: allAttachments.length > 0 ? allAttachments : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to update request.');
        return;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('An error occurred while saving changes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Edit Request ${request.id}`} width="600px">
      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8
            }}>
              <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{error}</p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="edit-requesterName">Requester Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              id="edit-requesterName"
              type="text"
              className="form-input"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-designation">Designation <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              id="edit-designation"
              type="text"
              className="form-input"
              value={requesterDesignation}
              onChange={(e) => setRequesterDesignation(e.target.value)}
              placeholder="Enter designation"
              required
            />
          </div>

          {/* Priority & Required By Date */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['Low', 'Medium', 'High', 'Urgent'] as const).map((p) => {
                  const isSelected = priority === p;
                  const colors = {
                    Low: { bg: 'rgba(16,185,129,0.12)', border: '#10b981', text: '#10b981', dot: '🟢' },
                    Medium: { bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', text: '#3b82f6', dot: '🔵' },
                    High: { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', text: '#f59e0b', dot: '🟠' },
                    Urgent: { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', text: '#ef4444', dot: '🔴' },
                  }[p];

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? `1.5px solid ${colors.border}` : '1px solid var(--border)',
                        background: isSelected ? colors.bg : 'var(--bg-hover)',
                        color: isSelected ? colors.text : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>{colors.dot}</span>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-requiredByDate">Required By Date</label>
              <input
                id="edit-requiredByDate"
                type="date"
                className="form-input"
                value={requiredByDate}
                onChange={(e) => setRequiredByDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-purposeJustification">Purpose / Justification</label>
            <textarea
              id="edit-purposeJustification"
              rows={2}
              className="form-input"
              placeholder="Explain the business need, purpose, or reason for this request..."
              value={purposeJustification}
              onChange={(e) => setPurposeJustification(e.target.value)}
              style={{ resize: 'vertical', fontSize: 12.5 }}
            />
          </div>

          <RequestDescriptionInput
            id="edit-description"
            value={description}
            onChange={(val) => setDescription(val)}
            required
          />

          {description.toLowerCase().includes('machinery') && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px dashed rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 18 }}>📄</span>
              <div>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--danger)' }}>
                  URS Document Mandatory
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  Items with <strong>New Machinery Purchase</strong> require a User Requirement Specification (URS) document.
                </p>
              </div>
            </div>
          )}

          <FileUpload
            existingAttachments={existingAttachments}
            onRemoveExisting={handleRemoveExisting}
            onFilesSelect={setNewFiles}
            maxSizeMb={15}
          />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {loading ? 'Saving…' : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
