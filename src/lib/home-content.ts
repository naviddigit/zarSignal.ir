export const homeTexts = {
  kicker: ['تیتر کوتاه', 'بازار را با عدد دنبال کن'],
  title: ['عنوان اصلی', 'قیمت را ببین.'],
  accent: ['ادامه عنوان', 'اختلافش را بشناس.'],
  description: ['توضیح اصلی', 'قیمت طلا و ارز، حباب و ماشین‌حساب در یک نگاه؛ برای پس‌انداز شخصی، معامله روزانه و کار حرفه‌ای.'],
  primary: ['دکمه قیمت‌ها', 'دیدن قیمت‌های بازار'],
  secondary: ['دکمه تحلیل', 'بررسی طلا و دلار'],
  premiumTitle: ['عنوان اشتراک', 'رایگان ببین؛ تاریخچه را وقتی لازم شد باز کن'],
  premiumBody: ['توضیح اشتراک', 'قیمت و ماشین‌حساب رایگان است. اشتراک فقط تاریخچه بلندتر می‌دهد تا روند را با گذشته مقایسه کنید — نه سیگنال معامله.'],
  apiTitle: ['عنوان توسعه‌دهندگان', 'API برای کسب‌وکار شما'],
  apiBody: ['توضیح توسعه‌دهندگان', 'قیمت با منبع و زمان را با کلید و سهمیه روزانه به سایت یا ربات خود وصل کنید.'],
  mobileTitle: ['عنوان نصب', 'بازار، یک لمس نزدیک‌تر'],
  mobileBody: ['توضیح نصب', 'زرسیگنال را روی صفحه اصلی گوشی یا کامپیوتر نصب کنید و مستقیم به ابزارها برسید.'],
  principlesTitle: ['عنوان شفافیت', 'عدد روشن؛ تصمیم آگاهانه'],
  principlesBody: ['توضیح شفافیت', 'کنار قیمت، زمان داده را ببینید. حباب اختلاف قیمت است؛ به‌تنهایی زمان خرید یا فروش را تعیین نمی‌کند.'],
} as const;
export const homeSections = { hero:'متن معرفی', radar:'رادار بازار', market:'قیمت‌های بازار', bubbles:'کارت‌های حباب', chart:'معرفی نمودار', calculator:'ماشین‌حساب', products:'اشتراک، API و نصب', faq:'پرسش‌های متداول', principles:'شفافیت داده' } as const;
export type HomeContent = { texts: Record<keyof typeof homeTexts,string>; sections: Record<keyof typeof homeSections,boolean> };
export const defaultHomeContent: HomeContent = {
  texts: Object.fromEntries(Object.entries(homeTexts).map(([key,value])=>[key,value[1]])) as HomeContent['texts'],
  sections: Object.fromEntries(Object.keys(homeSections).map(key=>[key,true])) as HomeContent['sections'],
};
export function parseHomeContent(value: unknown): HomeContent | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as {texts?:Record<string,unknown>;sections?:Record<string,unknown>};
  if (!input.texts || !input.sections) return null;
  const result: HomeContent = {texts:{...defaultHomeContent.texts},sections:{...defaultHomeContent.sections}};
  for (const key of Object.keys(homeTexts) as (keyof typeof homeTexts)[]) {
    const text = input.texts[key];
    if (typeof text !== 'string' || !text.trim() || text.length > 300) return null;
    result.texts[key] = text.trim();
  }
  for (const key of Object.keys(homeSections) as (keyof typeof homeSections)[]) {
    if (typeof input.sections[key] !== 'boolean') return null;
    result.sections[key] = input.sections[key];
  }
  return result;
}
