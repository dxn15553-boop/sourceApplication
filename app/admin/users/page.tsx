import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import AdminUsersClient from '@/app/admin/users/AdminUsersClient';
import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Manage Users' };

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const user = session.user as any;
  if (user.role !== 'admin') redirect('/dashboard');

  const [users, depts] = await Promise.all([
    db.query.profiles.findMany({
      with: { profileDepartments: { with: { department: { columns: { id: true, name: true } } } } },
      orderBy: (profiles, { asc }) => [asc(profiles.full_name)],
    }),
    db.query.departments.findMany({
      orderBy: (departments, { asc }) => [asc(departments.name)],
    }),
  ]);

  return (
    <AppShell pageTitle="Manage Users" pageSubtitle="Create and manage user accounts and roles">
      <AdminUsersClient users={users as any} departments={depts} />
    </AppShell>
  );
}
