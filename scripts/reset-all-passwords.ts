import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../lib/db/schema';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const result = await db.update(schema.profiles).set({ password_hash: hashedPassword }).returning();
  console.log(`Successfully reset passwords to 'admin123' for ${result.length} profiles.`);
}

main().catch(console.error);
