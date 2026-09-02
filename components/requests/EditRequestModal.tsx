'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import RequestDescriptionInput from '@/components/requests/RequestDescriptionInput';
import FileUpload from '@/components/ui/FileUpload';
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
  const [description, setDescription] = useState(request.description || '');
  const [file, setFile] = useState<File | null>(null);
  const [attachmentCleared, setAttachmentCleared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selected: File | null) => {
    setFile(selected);
    if (!selected) {
      // If selected is null, it means they cleared the attachment
      setAttachmentCleared(true);
    } else {
      setAttachmentCleared(false);
    }
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

    setLoading(true);
    try {
      let attachmentPath = request.attachment_path;
      let attachmentName = request.attachment_name;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadJson.error ?? 'File upload failed.');
          return;
        }
        attachmentPath = uploadJson.path;
        attachmentName = uploadJson.name;
      } else if (attachmentCleared) {
        attachmentPath = null;
        attachmentName = null;
      }

      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_name: requesterName.trim(),
          requester_designation: requesterDesignation.trim(),
          description: description.trim(),
          attachment_path: attachmentPath,
          attachment_name: attachmentName,
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

          <RequestDescriptionInput
            id="edit-description"
            value={description}
            onChange={(val) => setDescription(val)}
            required
          />

          <FileUpload
            onFileSelect={handleFileSelect}
            maxSizeMb={10}
            currentFileName={attachmentCleared ? null : request.attachment_name}
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
