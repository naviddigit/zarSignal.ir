/**
 * Production Auth P0 verify + cleanup.
 * Usage:
 *   node --env-file=.env scripts/p0-auth-verify.mjs check
 *   node --env-file=.env scripts/p0-auth-verify.mjs cleanup
 */
import { PrismaClient } from '@prisma/client';

const email = process.argv[3] || 'zs.p0.auth.20261001@example.com';
const mode = process.argv[2] || 'check';
const db = new PrismaClient();

async function main() {
  if (mode === 'migrate') {
    const rows = await db.$queryRawUnsafe(
      `SELECT migration_name, finished_at IS NOT NULL AS applied
       FROM "_prisma_migrations"
       WHERE migration_name LIKE '%password%' OR migration_name LIKE '%20261001%'
       ORDER BY migration_name`,
    );
    console.log(JSON.stringify({ passwordMigrations: rows }, null, 2));
    const cols = await db.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'User' AND column_name = 'passwordHash'`,
    );
    console.log(JSON.stringify({ passwordHashColumn: cols }, null, 2));
    return;
  }

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      subscriptions: {
        select: { id: true, product: true, status: true, userId: true, startsAt: true, expiresAt: true },
        orderBy: { startsAt: 'desc' },
      },
    },
  });

  if (!user) {
    console.log(JSON.stringify({ found: false, email }, null, 2));
    return;
  }

  if (mode === 'check') {
    console.log(JSON.stringify({
      found: true,
      id: user.id,
      email: user.email,
      name: user.name,
      hasPasswordHash: Boolean(user.passwordHash),
      passwordAlgo: user.passwordHash?.split('$')[0] ?? null,
      subscriptions: user.subscriptions.map(s => ({
        id: s.id,
        product: s.product,
        status: s.status,
        userIdMatches: s.userId === user.id,
        userId: s.userId,
      })),
    }, null, 2));
    return;
  }

  if (mode === 'cleanup') {
    const subIds = user.subscriptions.map(s => s.id);
    if (subIds.length) {
      await db.subscription.deleteMany({ where: { id: { in: subIds } } });
    }
    await db.analysisAcknowledgement.deleteMany({ where: { userId: user.id } }).catch(() => undefined);
    await db.account.deleteMany({ where: { userId: user.id } }).catch(() => undefined);
    await db.session.deleteMany({ where: { userId: user.id } }).catch(() => undefined);
    await db.apiKey.deleteMany({ where: { userId: user.id } }).catch(() => undefined);
    await db.payment.deleteMany({ where: { userId: user.id } }).catch(() => undefined);
    await db.user.delete({ where: { id: user.id } });
    console.log(JSON.stringify({ cleaned: true, email, deletedSubscriptions: subIds.length }, null, 2));
  }
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
