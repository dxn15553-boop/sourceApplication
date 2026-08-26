import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import AdminHodClient from '@/app/admin/hod-logins/AdminHodClient';
import AppShell from '@/components/layout/AppShell';
import { inArray } from 'drizzle-orm';
import { profiles } from '@/lib/db/schema';

export const metadata = { title: 'Manage HOD & Manager Logins' };

export default async function AdminHodPage() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin') redirect('/dashboard');

  const [allDepts, managers] = await Promise.all([
    db.query.departments.findMany({
      with: {
        profileDepartments: {
          with: {
            profile: true
          }
        }
      },
    }),
    db.select().from(profiles).where(inArray(profiles.role, [
      'final_head',
      'regional_coordinator',
      'procurement_manager',
      'section_manager'
    ]))
  ]);

  const standardDepartments = [
    'Admin', 'Agro Food', 'Agronomy', 'Cosmetics & Toiletries', 'EHS', 
    'Engineering', 'Finance', 'Ganoderma', 
    'Hospitality', 'Human Resources', 'IT', 'IWH', 
    'Kombucha', 'Legal', 'Maintenance', 'Nutraceutical', 'QC', 'QA', 'Others'
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

  const globalRoles = [
    { role: 'regional_coordinator', label: 'Regional Coordinator' },
    { role: 'final_head', label: 'Regional Head' },
    { role: 'procurement_manager', label: 'Procurement Manager' },
    { role: 'section_manager', label: 'Section Manager' },
  ] as const;

  const managerList = globalRoles.map(g => {
    const p = managers.find(profile => profile.role === g.role);
    return {
      role: g.role,
      roleLabel: g.label,
      email: p?.email || null,
      profileId: p?.id || null,
      plaintextPassword: p?.plaintext_password || null,
    };
  });

  return (
    <AppShell pageTitle="Manage HOD & Manager Logins" pageSubtitle="Create and manage Head of Department and Workflow Manager accounts">
      <AdminHodClient hodList={hodList} managerList={managerList} />
    </AppShell>
  );
}
