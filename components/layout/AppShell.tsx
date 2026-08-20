import { redirect } from 'next/navigation';
import Sidebar from './Sidebar';
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
  let departmentName = '';

  if (user.departmentIds && user.departmentIds.length > 0) {
    const depts = await db.query.departments.findMany({
      where: inArray(departments.id, user.departmentIds),
    });
    if (depts.length) departmentName = depts.map(d => d.name).join(', ');
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
      <Sidebar profile={profile} departmentName={departmentName} />
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
          {headerAction && <div>{headerAction}</div>}
        </header>

        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
