'use client';

import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    return (
      <div className="form-group">
        {label && (
          <label htmlFor={id} className="form-label">
            {label}
            {props.required && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`form-input ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
        {hint && !error && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</p>}
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
