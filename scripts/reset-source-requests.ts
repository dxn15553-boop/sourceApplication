import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('--- Resetting Source Requests and Counter ---');

  // Step 1: Count existing records before deletion
  const existingRequests = await sql.query('SELECT count(*) FROM source_requests;');
  console.log(`Found ${existingRequests[0].count} existing source request(s).`);

  // Step 2: Delete existing requests (cascades to workflow_actions, required_reviews, vendor_evaluations, notifications)
  await sql.query('DELETE FROM source_requests;');
  console.log('✓ All source requests deleted successfully.');

  // Also clean up any orphan notifications linked to source requests if not caught by cascade
  await sql.query("DELETE FROM notifications WHERE request_id IS NOT NULL AND request_id NOT IN (SELECT id FROM source_requests);");
  console.log('✓ Cleaned up any request-related notifications.');

  // Step 3: Reset the request_counter to 0 for current year (and clear any previous years if desired)
  const currentYear = new Date().getFullYear();
  await sql.query(`
    INSERT INTO request_counter (year, last_seq)
    VALUES (${currentYear}, 0)
    ON CONFLICT (year)
    DO UPDATE SET last_seq = 0;
  `);
  console.log(`✓ Request counter for year ${currentYear} reset to 0.`);

  // Verify
  const counterCheck = await sql.query(`SELECT * FROM request_counter WHERE year = ${currentYear};`);
  console.log('Current counter state:', counterCheck);
  console.log('The next submitted request will receive Source ID: 1 (SRC-' + currentYear + '-0001).');
}

main().catch(console.error);
