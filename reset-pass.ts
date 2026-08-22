import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await db.update(schema.profiles).set({ password_hash: hashedPassword }).where(eq(schema.profiles.email, 'hod@example.com'));
  console.log('Password reset to admin123 for hod@example.com');
}

main().catch(console.error);
