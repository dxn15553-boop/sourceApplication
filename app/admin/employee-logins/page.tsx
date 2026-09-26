import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import AdminEmployeeClient from '@/app/admin/employee-logins/AdminEmployeeClient';
import AppShell from '@/components/layout/AppShell';

export const metadata = { title: 'Manage Employee Logins' };

export default async function AdminEmployeePage() {
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
    'Engineering', 'Finance', 'Ganoderma', 
    'Hospitality', 'Human Resources', 'IT', 'IWH', 
    'Kombucha', 'Legal', 'Maintenance', 'Nutraceutical', 'QC', 'QA', 'Others'
  ];

  // Find any custom departments from the database that are not in standard list
  const customDepts = allDepts
    .filter(d => !standardDepartments.some(s => s.toLowerCase() === d.name.toLowerCase()))
    .map(d => d.name);

  const combinedDepts = [...standardDepartments, ...customDepts];

  const employeeList = combinedDepts.map(deptName => {
    const dbDept = allDepts.find(d => d.name.toLowerCase() === deptName.toLowerCase());
    
    // Find the latest employee profile (user role) if it exists
    const empLinks = (dbDept?.profileDepartments || []).filter(pd => pd.profile?.role === 'user' || pd.profile?.role === 'employee');
    empLinks.sort((a, b) => new Date(b.profile.created_at).getTime() - new Date(a.profile.created_at).getTime());
    const empProfile = empLinks[0]?.profile;

    return {
      departmentName: deptName,
      empEmail: empProfile?.email || null,
      empId: empProfile?.id || null,
      plaintextPassword: empProfile?.plaintext_password || null,
    };
  });

  return (
    <AppShell pageTitle="Manage Employee Logins" pageSubtitle="Create and manage Requester accounts for departments">
      <AdminEmployeeClient employeeList={employeeList} />
    </AppShell>
  );
}
