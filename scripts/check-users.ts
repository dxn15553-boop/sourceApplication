import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../lib/db/schema';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const users = await db.select().from(schema.profiles);
  if (users.length > 0) {
    console.log('Existing users found:');
    users.forEach(u => console.log(`Email: ${u.email}, Role: ${u.role}, Name: ${u.full_name}`));
  } else {
    console.log('No users found. Creating a default admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.insert(schema.profiles).values({
      id: crypto.randomUUID(),
      email: 'admin@example.com',
      password_hash: hashedPassword,
      full_name: 'Admin User',
      role: 'admin',
    });
    console.log('Created user: admin@example.com / admin123');
  }
}

main().catch(console.error);
