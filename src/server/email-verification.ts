import { randomInt, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { db } from '@/lib/db';
import { verificationHash, verificationMatches } from '@/lib/email-verification';
import { decryptIntegrationSecret } from '@/server/integration-secrets';
import { ensureAccountSchema } from '@/server/account-schema';
import { consumeRateLimit } from '@/server/rate-limit';
import { loginMetadata } from '@/lib/login-metadata';

export const EMAIL_CHALLENGE_COOKIE = 'zs_email_challenge';
export async function getResendConfig() {
  const row = await db.integrationSetting.findUnique({ where: { key: 'resend_email' } });
  if (!row?.enabled || !row.publicValue || !row.valueEncrypted) return null;
  return { from: row.publicValue, key: decryptIntegrationSecret(row.valueEncrypted) };
}

export async function sendVerificationCode(user: { id: string; email: string | null }) {
  const config = await getResendConfig();
  if (!config || !user.email || !process.env.AUTH_SECRET) throw new Error('سرویس تأیید ایمیل تنظیم نشده است؛ با پشتیبانی تماس بگیرید.');
  const limit = await consumeRateLimit(`email-send:${user.id}`, 60_000);
  if (!limit.allowed) throw new Error('برای ارسال دوباره یک دقیقه صبر کنید.');
  const ip = loginMetadata(await headers(), process.env.VERCEL === '1').ip;
  if (ip && !(await consumeRateLimit(`email-send-ip:${ip}`, 10_000)).allowed) throw new Error('برای ارسال دوباره چند لحظه صبر کنید.');
  await ensureAccountSchema();
  const id = randomBytes(32).toString('hex');
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const data = { id, tokenHash: verificationHash(id, code, process.env.AUTH_SECRET), expiresAt: new Date(Date.now() + 10 * 60_000), attempts: 0 };
  await db.emailChallenge.upsert({ where: { userId: user.id }, create: { ...data, userId: user.id }, update: data });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', 'Idempotency-Key': id },
    body: JSON.stringify({ from: config.from, to: [user.email], subject: 'کد تأیید ایمیل زرسیگنال', text: `کد تأیید شما: ${code}\nاعتبار: ۱۰ دقیقه. اگر درخواست نداده‌اید، این پیام را نادیده بگیرید.` }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    await db.emailChallenge.deleteMany({ where: { id } });
    throw new Error('ارسال ایمیل ناموفق بود؛ تنظیم فرستنده و Resend را بررسی کنید.');
  }
  (await cookies()).set(EMAIL_CHALLENGE_COOKIE, id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
}

export async function consumeVerificationCode(code: string) {
  const id = (await cookies()).get(EMAIL_CHALLENGE_COOKIE)?.value;
  if (!id || !process.env.AUTH_SECRET || !/^\d{6}$/.test(code)) return null;
  await ensureAccountSchema();
  return consumeEmailChallenge(id, code);
}

export async function consumeEmailChallenge(id: string, code: string) {
  if (!process.env.AUTH_SECRET || !/^\d{6}$/.test(code)) return null;
  return db.$transaction(async tx => {
    const updated = await tx.emailChallenge.updateMany({ where: { id, expiresAt: { gt: new Date() }, attempts: { lt: 5 } }, data: { attempts: { increment: 1 } } });
    if (!updated.count) return null;
    const row = await tx.emailChallenge.findUnique({ where: { id } });
    if (!row || !verificationMatches(id, code, row.tokenHash, process.env.AUTH_SECRET!)) return null;
    const consumed = await tx.emailChallenge.deleteMany({ where: { id } });
    if (!consumed.count) return null;
    return tx.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } });
  });
}
