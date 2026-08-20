import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { staff, departments } from '@/lib/db/schema';
import AdminStaffClient from './AdminStaffClient';
import { eq } from 'drizzle-orm';

export const metadata = { title: 'Manage Staff Directory' };

export default async function AdminStaffPage() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin') redirect('/dashboard');

  const allStaff = await db.query.staff.findMany({
    with: { department: { columns: { name: true } } },
    orderBy: (staff: any, { asc }: any) => [asc(staff.full_name)],
  });

  const allDepts = await db.select().from(departments).orderBy(departments.name);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Staff Directory</h1>
          <p className="page-subtitle">Add employees to decoupling logins from physical staff</p>
        </div>
      </div>
      
      <AdminStaffClient staffList={allStaff} departments={allDepts} />
    </div>
  );
}
