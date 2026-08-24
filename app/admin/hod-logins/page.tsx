import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import AdminHodClient from '@/app/admin/hod-logins/AdminHodClient';
import AppShell from '@/components/layout/AppShell';

export const metadata = { title: 'Manage HOD Logins' };

export default async function AdminHodPage() {
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
  });

  const standardDepartments = [
    'Admin', 'Agro Food', 'Agronomy', 'Cosmetics & Toiletries', 'EHS', 
    'Engineering', 'Environment Health and Safety', 'Finance', 'Ganoderma', 
    'Hospitality', 'Human Resources', 'IT Department', 'IWH', 
    'Information Technology', 'Inventory Warehouse', 'Kombucha', 
    'Legal', 'Nutraceutical', 'QC', 'QA', 'Others'
  ];

  const hodList = standardDepartments.map(deptName => {
    // Find if the department exists in the DB
    const dbDept = allDepts.find(d => d.name.toLowerCase() === deptName.toLowerCase());
    
    // Find the HOD profile if it exists
    const hodProfile = dbDept?.profileDepartments.find(pd => pd.profile.role === 'hod')?.profile;

    return {
      departmentName: deptName,
      hodEmail: hodProfile?.email || null,
      hodId: hodProfile?.id || null,
      plaintextPassword: hodProfile?.plaintext_password || null,
    };
  });

  return (
    <AppShell pageTitle="Manage HOD Logins" pageSubtitle="Create and manage Head of Department accounts">
      <AdminHodClient hodList={hodList} />
    </AppShell>
  );
}
