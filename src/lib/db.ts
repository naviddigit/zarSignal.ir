import { PrismaClient } from '@prisma/client';
import { runtimeDatabaseUrl } from '@/lib/database-url';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalDb.prisma ??= new PrismaClient({ datasourceUrl: runtimeDatabaseUrl(process.env.DATABASE_URL) });
