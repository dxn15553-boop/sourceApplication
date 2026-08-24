import { db } from './lib/db';
import { profiles, profileDepartments } from './lib/db/schema';
import { notInArray, eq, not, inArray } from 'drizzle-orm';
import 'dotenv/config';

async function cleanup() {
  try {
    // Delete all profiles that aren't admin and have no sourceRequests (to be safe)
    // Actually, just delete all non-admin profiles. The user wants to start fresh.
    console.log('Cleaning up orphaned profiles...');
    const result = await db.delete(profiles).where(not(eq(profiles.role, 'admin'))).returning();
    console.log(`Deleted ${result.length} profiles.`);
  } catch (e: any) {
    console.error('Error:', e);
  }
}
cleanup();
