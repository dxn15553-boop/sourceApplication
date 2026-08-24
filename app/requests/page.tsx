import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import RequestsListClient from './RequestsListClient';
import type { Metadata } from 'next';
import { auth } from '@/auth';

export const metadata: Metadata = { title: 'Source Requests' };
export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = session.user as any;
  const activeDepartmentId = user.departmentIds?.[0] || null;

  return (
    <AppShell pageTitle="Source Requests" pageSubtitle="All requests you have access to">
      <RequestsListClient userRole={user.role} />
    </AppShell>
  );
}
