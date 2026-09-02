'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, X, FileText, CheckCircle, Plus, Paperclip } from 'lucide-react';

export interface ExistingAttachment {
  name: string;
  path: string;
  size?: number;
}

interface FileUploadProps {
  onFilesSelect?: (files: File[]) => void;
  onFileSelect?: (file: File | null) => void;
  accept?: string;
  maxSizeMb?: number;
  multiple?: boolean;
  currentFileName?: string | null;
  existingAttachments?: ExistingAttachment[];
  onRemoveExisting?: (index: number) => void;
  label?: string;
}

export default function FileUpload({
  onFilesSelect,
  onFileSelect,
  accept = '*/*',
  maxSizeMb = 15,
  multiple = true,
  currentFileName,
  existingAttachments = [],
  onRemoveExisting,
  label = 'Supporting Documents / Attachments',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const notifyChange = useCallback(
    (files: File[]) => {
      setSelectedFiles(files);
      if (onFilesSelect) onFilesSelect(files);
      if (onFileSelect) onFileSelect(files[0] || null);
    },
    [onFilesSelect, onFileSelect]
  );

  const handleAddFiles = useCallback(
    (incomingFiles: FileList | File[] | null) => {
      setError(null);
      if (!incomingFiles || incomingFiles.length === 0) return;

      const fileArray = Array.from(incomingFiles);
      const oversized = fileArray.find((f) => f.size > maxSizeMb * 1024 * 1024);

      if (oversized) {
        setError(`File "${oversized.name}" exceeds maximum size of ${maxSizeMb}MB.`);
        return;
      }

      if (!multiple) {
        notifyChange([fileArray[0]]);
        return;
      }

      // Merge avoiding duplicate names
      const existingNames = new Set(selectedFiles.map((f) => f.name));
      const newUnique = fileArray.filter((f) => !existingNames.has(f.name));
      const combined = [...selectedFiles, ...newUnique];
      notifyChange(combined);
    },
    [maxSizeMb, multiple, notifyChange, selectedFiles]
  );

  const handleRemoveFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    notifyChange(updated);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleAddFiles(e.dataTransfer.files);
    },
    [handleAddFiles]
  );

  const totalFilesCount = selectedFiles.length + existingAttachments.length;

  return (
    <div className="form-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label className="form-label" style={{ margin: 0 }}>
          {label}
        </label>
        {totalFilesCount > 0 && (
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
            {totalFilesCount} file{totalFilesCount > 1 ? 's' : ''} attached
          </span>
        )}
      </div>

      {/* Existing Attachments (if editing) */}
      {existingAttachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {existingAttachments.map((att, idx) => (
            <div
              key={`existing-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 8,
              }}
            >
              <Paperclip size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={att.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--accent)',
                    textDecoration: 'underline',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {att.name}
                </a>
              </div>
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(idx)}
                  title="Remove attachment"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 4,
                  }}
                  onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--danger)')}
                  onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Newly Selected Files List */}
      {selectedFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {selectedFiles.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 8,
              }}
            >
              <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '1px 0 0' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(idx)}
                title="Remove file"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 4,
                }}
                onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--danger)')}
                onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        className={`file-drop ${dragging ? 'drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{ cursor: 'pointer', padding: selectedFiles.length > 0 ? '16px 20px' : '24px 20px' }}
      >
        {selectedFiles.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
              + Add more files / documents
            </span>
          </div>
        ) : (
          <>
            <Upload size={30} style={{ color: 'var(--text-muted)', marginBottom: 10, margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
              Drop files here or <span style={{ color: 'var(--accent)' }}>browse</span>
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0' }}>
              Upload multiple files (URS, Quotations, Drawings, Specs) • Up to {maxSizeMb}MB per file
            </p>
          </>
        )}
      </div>

      {error && <p className="form-error" style={{ marginTop: 6 }}>{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={(e) => {
          handleAddFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
    </div>
  );
}
