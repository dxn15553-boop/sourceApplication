import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicPath = nextUrl.pathname.startsWith('/login');

      if (isLoggedIn && isPublicPath) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      
      if (!isLoggedIn && !isPublicPath) {
        return false;
      }
      return true;
    },
  },
  providers: [], // Add providers with Node.js dependencies in auth.ts
} satisfies NextAuthConfig;
