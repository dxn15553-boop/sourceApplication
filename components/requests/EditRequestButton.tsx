'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import EditRequestModal from './EditRequestModal';
import { useRouter } from 'next/navigation';

export default function EditRequestButton({ request }: { request: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        className="btn btn-primary"
        onClick={() => setIsOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <Pencil size={14} /> Edit Request
      </button>

      {isOpen && (
        <EditRequestModal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          request={request}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
}
