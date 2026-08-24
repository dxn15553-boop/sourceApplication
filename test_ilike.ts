import { db } from './lib/db';
import { departments } from './lib/db/schema';
import { ilike } from 'drizzle-orm';
import 'dotenv/config';

async function test() {
  try {
    const res = await db.select().from(departments).where(ilike(departments.name, 'Agro Food')).limit(1);
    console.log(res);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
