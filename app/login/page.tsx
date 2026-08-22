import { db } from '@/lib/db';
import { departments } from '@/lib/db/schema';
import LoginClient from './LoginClient';

export const metadata = {
  title: 'Login - DXN Procurement',
};

export default async function LoginPage() {
  const allDepartments = await db.select({ id: departments.id, name: departments.name }).from(departments);
  
  return <LoginClient departments={allDepartments} />;
}
