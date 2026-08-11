import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// NextAuth creates a proxy for us using the configuration
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
