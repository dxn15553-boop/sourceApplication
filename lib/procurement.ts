import { db } from './db';
import { profiles } from './db/schema';
import { eq } from 'drizzle-orm';

export interface ProcurementEmployee {
  id: string;
  full_name: string;
  email: string;
  profileDepartments: { department: { name: string } }[];
}

let cachedEmployees: ProcurementEmployee[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // Cache for 1 minute

/**
 * Fetches procurement team employees from the external Procurement database.
 * If that fails (e.g. cold start / connection timeout), retries once,
 * and falls back to the local database profiles table.
 */
export async function getProcurementEmployees(): Promise<ProcurementEmployee[]> {
  const now = Date.now();
  if (cachedEmployees && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedEmployees;
  }

  const procurementDbUrl = process.env.PROCUREMENT_DATABASE_URL || 'postgresql://neondb_owner:npg_uFBo8j7aQxrw@ep-floral-salad-attipwvv-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require';
  if (procurementDbUrl) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { neon } = await import('@neondatabase/serverless');
        const pSql = neon(procurementDbUrl);
        const rows = await pSql`
          SELECT u.id, u.name as "full_name", u.email, d.name as "department_name"
          FROM "User" u
          LEFT JOIN "Department" d ON u."departmentId" = d.id
          WHERE u.role = 'TEAM' AND u."isActive" = true
          ORDER BY u.name
        `;
        const employees: ProcurementEmployee[] = rows.map((r: any) => ({
          id: r.id,
          full_name: r.full_name,
          email: r.email,
          profileDepartments: r.department_name ? [{ department: { name: r.department_name } }] : []
        }));

        if (employees.length > 0) {
          cachedEmployees = employees;
          lastFetchTime = Date.now();
          return employees;
        }
      } catch (err: any) {
        if (attempt === 1) {
          // Wait 1.5s for Neon serverless compute cold-start to wake up
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          console.warn('[Procurement DB] Query failed, falling back to local profiles:', err?.message || err);
        }
      }
    }
  }

  // Graceful fallback to local profiles
  try {
    const localProfiles = await db.query.profiles.findMany({
      where: eq(profiles.role, 'employee'),
      with: { profileDepartments: { with: { department: { columns: { name: true } } } } },
      orderBy: (p: any, { asc }: any) => [asc(p.full_name)],
    });
    return localProfiles as ProcurementEmployee[];
  } catch (err) {
    console.error('Failed to fetch local fallback profiles:', err);
    return [];
  }
}
