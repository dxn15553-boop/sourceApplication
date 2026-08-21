import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { profiles, profileDepartments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const userProfiles = await db.select().from(profiles).where(eq(profiles.email, credentials.email as string)).limit(1);
        const user = userProfiles[0];
        if (!user) return null;

        const passwordsMatch = await bcrypt.compare(credentials.password as string, user.password_hash);
        if (!passwordsMatch) return null;

        const depts = await db.select().from(profileDepartments).where(eq(profileDepartments.profile_id, user.id));
        const departmentIds = depts.map(d => d.department_id);

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          departmentIds: departmentIds,
        } as any;
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.departmentIds = (user as any).departmentIds;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        (session.user as any).role = token.role;
        (session.user as any).departmentIds = token.departmentIds;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  }
});
