import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Sidebar from './Sidebar';
import DepartmentSwitcher from './DepartmentSwitcher';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { departments } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import type { Profile } from '@/lib/types';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  headerAction?: React.ReactNode;
}

export default async function AppShell({
  children,
  pageTitle,
  pageSubtitle,
  headerAction,
}: AppShellProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const user = session.user as any;
  let departmentsData: { id: string; name: string }[] = [];

  if (user.departmentIds && user.departmentIds.length > 0) {
    departmentsData = await db.query.departments.findMany({
      where: inArray(departments.id, user.departmentIds),
      orderBy: (d: any, { asc }: any) => [asc(d.name)],
    });
  } else if (user.role === 'user' || user.role === 'hod') {
    // Universal logins can access all departments
    departmentsData = await db.query.departments.findMany({
      orderBy: (d: any, { asc }: any) => [asc(d.name)],
    });
    // Set user's departmentIds so it's consistent
    user.departmentIds = departmentsData.map(d => d.id);
  }

  const cookieStore = await cookies();
  const activeDeptCookie = cookieStore.get('active_department_id');
  const activeDepartmentId = activeDeptCookie?.value || (user.departmentIds?.[0] ?? '');

  let activeDeptName = '';
  if (departmentsData.length > 0) {
    const active = departmentsData.find(d => d.id === activeDepartmentId) || departmentsData[0];
    activeDeptName = active?.name || '';
  }

  const profile: Profile = {
    id: user.id,
    full_name: user.name,
    role: user.role,
    departmentIds: user.departmentIds || [],
    created_at: new Date().toISOString(), // Mocked as not needed in sidebar
  };

  return (
    <div className="app-layout">
      <Sidebar profile={profile} departmentName={activeDeptName} />
      <div className="main-content">
        <header className="topbar">
          <div style={{ flex: 1 }}>
            {pageTitle && (
              <div>
                <h1 className="text-lg font-bold text-[var(--text-primary)] m-0">
                  {pageTitle}
                </h1>
                {pageSubtitle && (
                  <p className="text-xs text-[var(--text-muted)] m-0 mt-1 font-medium">{pageSubtitle}</p>
                )}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {departmentsData.length > 0 && (
              <DepartmentSwitcher departments={departmentsData} activeId={activeDepartmentId} />
            )}
            {headerAction && <div>{headerAction}</div>}
          </div>
        </header>

        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
