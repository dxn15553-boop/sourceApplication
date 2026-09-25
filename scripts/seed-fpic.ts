import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../lib/db/schema';
import { eq, ilike } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log('Seeding / updating HOD departments and profiles...');

  // 1. Ensure Kombucha department exists
  let kombuchaDept = await db.query.departments.findFirst({
    where: ilike(schema.departments.name, 'Kombucha')
  });

  if (!kombuchaDept) {
    const [inserted] = await db.insert(schema.departments).values({
      name: 'Kombucha'
    }).returning();
    kombuchaDept = inserted;
    console.log(`Created Kombucha department with ID: ${kombuchaDept.id}`);
  } else {
    console.log(`Kombucha department already exists with ID: ${kombuchaDept.id}`);
  }

  // 2. Ensure Agro Food department exists
  const agroDept = await db.query.departments.findFirst({
    where: ilike(schema.departments.name, 'Agro Food')
  });
  console.log(`Agro Food department ID: ${agroDept?.id}`);

  // 3. Update agro@gmail.com full_name to 'HOD (Agro Food)'
  const agroProfile = await db.query.profiles.findFirst({
    where: eq(schema.profiles.email, 'agro@gmail.com')
  });

  if (agroProfile) {
    await db.update(schema.profiles)
      .set({ full_name: 'HOD (Agro Food)' })
      .where(eq(schema.profiles.id, agroProfile.id));
    console.log(`Updated agro@gmail.com name to "HOD (Agro Food)"`);
  }

  // 4. Ensure kombucha@gmail.com profile exists
  let kombuchaProfile = await db.query.profiles.findFirst({
    where: eq(schema.profiles.email, 'kombucha@gmail.com')
  });

  if (!kombuchaProfile) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    const [insertedProfile] = await db.insert(schema.profiles).values({
      email: 'kombucha@gmail.com',
      password_hash: passwordHash,
      plaintext_password: 'admin123',
      full_name: 'HOD (Kombucha)',
      role: 'hod',
    }).returning();
    kombuchaProfile = insertedProfile;
    console.log(`Created profile for kombucha@gmail.com (HOD Kombucha)`);
  } else {
    await db.update(schema.profiles)
      .set({ full_name: 'HOD (Kombucha)' })
      .where(eq(schema.profiles.id, kombuchaProfile.id));
    console.log(`Updated kombucha@gmail.com name to "HOD (Kombucha)"`);
  }

  // 5. Link kombucha profile to kombucha department
  if (kombuchaDept && kombuchaProfile) {
    const existingLink = await db.query.profileDepartments.findFirst({
      where: (pd, { and, eq }) => and(
        eq(pd.profile_id, kombuchaProfile!.id),
        eq(pd.department_id, kombuchaDept!.id)
      )
    });

    if (!existingLink) {
      await db.insert(schema.profileDepartments).values({
        profile_id: kombuchaProfile.id,
        department_id: kombuchaDept.id,
      });
      console.log(`Linked kombucha@gmail.com to Kombucha department`);
    } else {
      console.log(`kombucha@gmail.com is already linked to Kombucha department`);
    }
  }

  console.log('HOD seeding and updates completed successfully!');
}

main().catch(console.error);
