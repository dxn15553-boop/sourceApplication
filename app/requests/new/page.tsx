import AppShell from '@/components/layout/AppShell';
import NewRequestForm from './NewRequestForm';
import type { Metadata } from 'next';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { departments, staff } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'New Source Request' };

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  
  const user = session.user as any;
  const userDeptIds = user.departmentIds || [];
  
  let userDepartments: { id: string, name: string }[] = [];
  let availableStaff: any[] = [];
  if (userDeptIds.length > 0) {
    userDepartments = await db.select().from(departments).where(inArray(departments.id, userDeptIds));
    availableStaff = await db.query.staff.findMany({
      where: inArray(staff.department_id, userDeptIds),
      orderBy: (s: any, { asc }: any) => [asc(s.full_name)],
    });
  }

  return (
    <AppShell pageTitle="New Source Request" pageSubtitle="Submit a new source request for HOD review">
      <NewRequestForm userDepartments={userDepartments} availableStaff={availableStaff} />
    </AppShell>
  );
}
