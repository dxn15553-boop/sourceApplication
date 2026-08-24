'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={id} className="form-label">
            {label}
            {props.required && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          <input
            ref={ref}
            id={id}
            type={inputType}
            className={`form-input ${error ? 'border-red-500' : ''} ${className}`}
            style={isPassword ? { paddingRight: '2.5rem' } : undefined}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {hint && !error && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</p>}
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
