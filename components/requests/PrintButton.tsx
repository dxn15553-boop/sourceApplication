'use client';

import { useEffect } from 'react';
import { Printer } from 'lucide-react';

interface PrintButtonProps {
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function PrintButton({
  label = 'Print / Save as PDF',
  className = 'btn btn-primary',
  style,
}: PrintButtonProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('download') === '1' || params.get('print') === '1') {
        const timer = setTimeout(() => {
          window.print();
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  return (
    <button
      onClick={() => window.print()}
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', ...style }}
    >
      <Printer size={16} />
      <span>{label}</span>
    </button>
  );
}
