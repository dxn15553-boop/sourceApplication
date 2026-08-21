import AppShell from '@/components/layout/AppShell';
import NewRequestForm from './NewRequestForm';
import type { Metadata } from 'next';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { departments } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'New Source Request' };

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  
  // Fetch all departments so the requester can select the appropriate one
  const allDepartments = await db.select().from(departments).orderBy(departments.name);

  return (
    <AppShell pageTitle="New Source Request" pageSubtitle="Submit a new source request for HOD review">
      <NewRequestForm userDepartments={allDepartments} />
    </AppShell>
  );
}
