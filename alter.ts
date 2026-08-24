import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    await sql`ALTER TABLE profiles ADD COLUMN plaintext_password TEXT;`;
    console.log('Column added successfully');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('Column already exists.');
    } else {
      console.error(error);
    }
  }
}
main();
