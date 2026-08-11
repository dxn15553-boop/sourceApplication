import AppShell from '@/components/layout/AppShell';
import SearchClient from './SearchClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Search' };

export default function SearchPage() {
  return (
    <AppShell pageTitle="Search" pageSubtitle="Find a source request by its unique ID">
      <SearchClient />
    </AppShell>
  );
}
