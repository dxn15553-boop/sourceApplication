import AppShell from '@/components/layout/AppShell';
import NewRequestForm from './NewRequestForm';
import type { Metadata } from 'next';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { departments } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'New Source Request' };

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  
  const allDepartments = await db.select().from(departments).orderBy(departments.name);
  const cookieStore = await cookies();
  const activeDeptCookie = cookieStore.get('active_department_id');
  const activeDeptId = activeDeptCookie?.value || (allDepartments.length > 0 ? allDepartments[0].id : '');
  const activeDept = allDepartments.find(d => d.id === activeDeptId);

  return (
    <AppShell pageTitle="New Source Request" pageSubtitle="Submit a new source request for HOD review">
      <NewRequestForm departmentId={activeDeptId} departmentName={activeDept?.name || ''} />
    </AppShell>
  );
}
