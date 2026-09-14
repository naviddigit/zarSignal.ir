import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const integrations = [
    { key: 'market_primary', category: 'market', label: 'منبع اصلی قیمت بازار' },
    { key: 'market_fallback', category: 'market', label: 'منبع پشتیبان قیمت' },
    { key: 'ai_analysis', category: 'analysis', label: 'سرویس تحلیل هوشمند' },
  ];
  for (const integration of integrations) {
    await db.integrationSetting.upsert({
      where: { key: integration.key },
      create: { ...integration, enabled: false },
      update: { label: integration.label, category: integration.category },
    });
  }
}

main().finally(() => db.$disconnect());
