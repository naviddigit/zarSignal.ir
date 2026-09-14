import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';

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
  const hamrateConfig = JSON.parse(await readFile('config/hamrate.json', 'utf8'));
  await db.marketSource.upsert({
    where: { key: 'hamrate-web' },
    create: { key: 'hamrate-web', name: 'HamRate (صفحه عمومی)', url: 'https://hamrate.com/', enabled: false, pollSeconds: 300, config: hamrateConfig },
    update: { name: 'HamRate (صفحه عمومی)', config: hamrateConfig },
  });
}

main().finally(() => db.$disconnect());
