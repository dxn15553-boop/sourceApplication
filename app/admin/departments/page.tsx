import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { departments, profiles } from '@/lib/db/schema';
import AdminDepartmentsClient from '@/app/admin/departments/AdminDepartmentsClient';
import { eq } from 'drizzle-orm';

export const metadata = { title: 'Manage Departments' };

export default async function AdminDepartmentsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin') redirect('/dashboard');

  // Fetch all departments
  const allDepts = await db.select().from(departments).orderBy(departments.name);

  // We should also get the count of users per department to show in the table
  const allProfiles = await db.select({
    id: profiles.id,
    department_id: profiles.department_id,
  }).from(profiles);

  const departmentsWithCounts = allDepts.map(dept => {
    const userCount = allProfiles.filter(p => p.department_id === dept.id).length;
    return { ...dept, userCount };
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Departments</h1>
          <p className="page-subtitle">Add and configure organizational departments</p>
        </div>
      </div>
      
      <AdminDepartmentsClient departments={departmentsWithCounts} />
    </div>
  );
}
