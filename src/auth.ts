import NextAuth from 'next-auth';
import { cache } from 'react';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import { decryptIntegrationSecret } from '@/server/integration-secrets';
import { validEmail, validPassword, verifyPassword } from '@/lib/password';
import { headers } from 'next/headers';
import { getAccountPolicy } from '@/server/account-policy';
import { consumeVerificationCode } from '@/server/email-verification';
import { ensureAccountSchema } from '@/server/account-schema';
import { loginMetadata } from '@/lib/login-metadata';

function validGoogleCredentials(clientId?: string | null, clientSecret?: string | null) {
  return Boolean(clientId?.endsWith('.apps.googleusercontent.com') && clientSecret && clientSecret.length >= 20);
}

const googleCredentials = cache(async () => {
  try {
    const query = { where: { key: 'google_oauth' } };
    // Retry a transient DB failure before treating the configured provider as unavailable.
    const setting = await db.integrationSetting.findUnique(query)
      .catch(() => db.integrationSetting.findUnique(query));
    if (setting?.enabled && setting.publicValue && setting.valueEncrypted) {
      const clientSecret = decryptIntegrationSecret(setting.valueEncrypted);
      if (validGoogleCredentials(setting.publicValue, clientSecret)) return { clientId: setting.publicValue, clientSecret };
    }
  } catch { /* environment fallback below */ }
  if (validGoogleCredentials(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)) {
    return { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET };
  }
  return null;
});

export async function getAuthCapabilities() {
  return {
    google: Boolean(await googleCredentials()),
    email: Boolean(process.env.AUTH_SECRET),
    phone: false, // OTP not implemented; do not show a non-working form as available.
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(async request => {
  if (request && /^\/api\/auth\/(callback|signin)\//.test(new URL(request.url).pathname)) await ensureAccountSchema();
  const google = await googleCredentials();
  return {
    secret: process.env.AUTH_SECRET,
    adapter: PrismaAdapter(db),
    // JWT required for Credentials; Google users still persist via adapter.
    session: { strategy: 'jwt' },
    providers: [
      ...(google ? [Google(google)] : []),
      Credentials({
        id: 'credentials',
        name: 'Email',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
          code: { label: 'Verification code', type: 'text' },
        },
        async authorize(credentials) {
          if (typeof credentials?.code === 'string') {
            const user = await consumeVerificationCode(credentials.code);
            return user ? { id: user.id, email: user.email, name: user.name, image: user.image } : null;
          }
          const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : '';
          const password = typeof credentials?.password === 'string' ? credentials.password : '';
          if (!validEmail(email) || !validPassword(password)) return null;
          const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, image: true, passwordHash: true, emailVerified: true } });
          if (!user?.passwordHash) return null;
          if (!verifyPassword(password, user.passwordHash)) return null;
          if ((await getAccountPolicy()).emailVerificationRequired && !user.emailVerified) return null;
          return { id: user.id, email: user.email, name: user.name, image: user.image };
        },
      }),
    ],
    pages: { signIn: '/login' },
    trustHost: true,
    events: {
      async signIn({ user, account }) {
        if (!user.id) return;
        try {
          await ensureAccountSchema();
          const metadata = loginMetadata(await headers(), process.env.VERCEL === '1');
          await db.loginEvent.create({ data: { userId: user.id, provider: account?.provider ?? 'credentials', ...metadata } });
        } catch { console.warn('Login audit could not be recorded'); }
      },
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user?.id) token.sub = user.id;
        return token;
      },
      async session({ session, token }) {
        if (session.user && token.sub) {
          session.user.id = token.sub;
        }
        return session;
      },
    },
  };
});
