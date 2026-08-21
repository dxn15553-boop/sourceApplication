import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { departments, profileDepartments } from '@/lib/db/schema';
import AdminDepartmentsClient from '@/app/admin/departments/AdminDepartmentsClient';
import AppShell from '@/components/layout/AppShell';

export const metadata = { title: 'Manage Departments' };

export default async function AdminDepartmentsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin') redirect('/dashboard');

  const allDepts = await db.query.departments.findMany({
    with: {
      profileDepartments: {
        with: {
          profile: true
        }
      }
    },
    orderBy: (departments, { asc }) => [asc(departments.name)],
  });

  const departmentsWithCounts = allDepts.map(dept => {
    const userCount = dept.profileDepartments.length;
    const hod = dept.profileDepartments.find(pd => pd.profile.role === 'hod')?.profile;
    
    return { 
      id: dept.id,
      name: dept.name,
      userCount, 
      hodName: hod?.full_name || null,
      hodEmail: hod?.email || null,
    };
  });

  return (
    <AppShell pageTitle="Manage Departments" pageSubtitle="Add and configure organizational departments">
      <AdminDepartmentsClient departments={departmentsWithCounts} />
    </AppShell>
  );
}
