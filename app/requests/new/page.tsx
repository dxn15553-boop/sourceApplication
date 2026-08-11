import AppShell from '@/components/layout/AppShell';
import NewRequestForm from './NewRequestForm';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'New Source Request' };

export default function NewRequestPage() {
  return (
    <AppShell pageTitle="New Source Request" pageSubtitle="Submit a new source request for HOD review">
      <NewRequestForm />
    </AppShell>
  );
}
