import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  const sqlContent = fs.readFileSync(path.join(process.cwd(), 'drizzle', '0001_careless_shotgun.sql'), 'utf-8');
  
  // Drizzle generates statements separated by `--> statement-breakpoint`
  const statements = sqlContent.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  
  for (const statement of statements) {
    console.log(`Executing: ${statement.slice(0, 50)}...`);
    // eslint-disable-next-line
    // @ts-ignore
    await sql.query(statement);
  }
  
  console.log('Migration completed successfully!');
}

run().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
