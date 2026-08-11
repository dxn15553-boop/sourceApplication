'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, X, FileText, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSizeMb?: number;
  currentFileName?: string | null;
}

export default function FileUpload({
  onFileSelect,
  accept = '*/*',
  maxSizeMb = 10,
  currentFileName,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((file: File | null) => {
    setError(null);
    if (!file) { setSelectedFile(null); onFileSelect(null); return; }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File too large. Max size is ${maxSizeMb}MB.`);
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
  }, [maxSizeMb, onFileSelect]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0] ?? null;
    handleFile(file);
  }, [handleFile]);

  const displayName = selectedFile?.name ?? currentFileName ?? null;

  return (
    <div className="form-group">
      <label className="form-label">Attachment</label>

      {displayName ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 8,
        }}>
          <CheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </p>
            {selectedFile && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { handleFile(null); if (inputRef.current) inputRef.current.value = ''; }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className={`file-drop ${dragging ? 'drag-over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: 12, margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Drop file here or <span style={{ color: 'var(--accent)' }}>browse</span>
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Max {maxSizeMb}MB — PDF, Word, Excel, images supported
          </p>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
