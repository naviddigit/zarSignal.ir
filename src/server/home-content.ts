import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';
import { defaultHomeContent, parseHomeContent, type HomeContent } from '@/lib/home-content';

export const homeContentKey = 'homepage-content-v1';

/** Replace known long launch copy if still stored from older defaults. */
const copyRefresh: Partial<HomeContent['texts']> = {
  description: defaultHomeContent.texts.description,
  premiumBody: defaultHomeContent.texts.premiumBody,
};

const staleCopy = [
  'قیمت طلا و ارز، حباب و ماشین‌حساب در یک نگاه؛ برای پس‌انداز شخصی، معامله روزانه و کار حرفه‌ای.',
  'قیمت، حباب و ماشین‌حساب — شفاف و در یک نگاه.',
  'قیمت و ماشین‌حساب رایگان است. اشتراک فقط تاریخچه بلندتر می‌دهد تا روند را با گذشته مقایسه کنید — نه سیگنال معامله.',
];

function refreshStaleCopy(content: HomeContent): HomeContent {
  const texts = { ...content.texts };
  for (const [key, next] of Object.entries(copyRefresh) as [keyof HomeContent['texts'], string][]) {
    if (staleCopy.includes(texts[key])) texts[key] = next;
  }
  return { ...content, texts };
}

export async function getHomeContent() {
  try {
    const row = await withDeadline(db.integrationSetting.findUnique({ where: { key: homeContentKey } }), 2000);
    const parsed = row?.publicValue ? parseHomeContent(JSON.parse(row.publicValue)) ?? defaultHomeContent : defaultHomeContent;
    return refreshStaleCopy(parsed);
  } catch {
    return defaultHomeContent;
  }
}
