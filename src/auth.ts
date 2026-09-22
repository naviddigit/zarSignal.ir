import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import { decryptIntegrationSecret } from '@/server/integration-secrets';

function validGoogleCredentials(clientId?: string | null, clientSecret?: string | null) {
  return Boolean(clientId?.endsWith('.apps.googleusercontent.com') && clientSecret && clientSecret.length >= 20);
}

async function googleCredentials() {
  try {
    const setting = await db.integrationSetting.findUnique({ where: { key: 'google_oauth' } });
    if (setting?.enabled && setting.publicValue && setting.valueEncrypted) {
      const clientSecret = decryptIntegrationSecret(setting.valueEncrypted);
      if (validGoogleCredentials(setting.publicValue, clientSecret)) return { clientId: setting.publicValue, clientSecret };
    }
  } catch { /* environment fallback below */ }
  if (validGoogleCredentials(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)) {
    return { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET };
  }
  return null;
}

export async function getAuthCapabilities() {
  return { google: Boolean(await googleCredentials()), phone: Boolean(process.env.SMS_PROVIDER_API_KEY) };
}

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const google = await googleCredentials();
  return {
    secret: process.env.AUTH_SECRET,
    adapter: PrismaAdapter(db),
    providers: google ? [Google(google)] : [],
    pages: { signIn: '/login' },
    session: { strategy: 'database' },
    trustHost: true,
  };
});
