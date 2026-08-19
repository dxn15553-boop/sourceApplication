const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

async function seed() {
  const sql = neon('postgresql://neondb_owner:npg_nDKjS7bBW5vz@ep-misty-rice-ayivstqy-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require');
  
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const testUsers = [
    { email: 'hod@example.com', role: 'hod', full_name: 'Test HOD' },
    { email: 'regionalhead@example.com', role: 'final_head', full_name: 'Test Regional Head' },
    { email: 'pm@example.com', role: 'procurement_manager', full_name: 'Test Procurement Manager' },
    { email: 'sm@example.com', role: 'section_manager', full_name: 'Test Section Manager' },
    { email: 'employee@example.com', role: 'employee', full_name: 'Test Employee' },
  ];
  
  // Create a default department first if needed, but let's just leave department_id null for now
  // Actually, let's create one department and assign them to it.
  const deptResult = await sql`INSERT INTO departments (name) VALUES ('Test Department') ON CONFLICT (name) DO NOTHING RETURNING id`;
  let deptId;
  if (deptResult.length > 0) {
    deptId = deptResult[0].id;
  } else {
    const existing = await sql`SELECT id FROM departments WHERE name = 'Test Department' LIMIT 1`;
    deptId = existing[0].id;
  }

  for (const u of testUsers) {
    await sql`
      INSERT INTO profiles (email, password_hash, full_name, role, department_id)
      VALUES (${u.email}, ${passwordHash}, ${u.full_name}, ${u.role}, ${deptId})
      ON CONFLICT (email) DO NOTHING
    `;
    console.log(`Ensured user: ${u.email} / password123 (Role: ${u.role})`);
  }
}

seed().catch(console.error);
