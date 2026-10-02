/**
 * Honest Master / product matrix — only from what exists in this repo.
 * Do not invent V5.7 decision/RSI/coin rules from chat samples; Master Prompt V5.7 file is not in the tree.
 */

export type MatrixPresence = 'present' | 'partial' | 'absent' | 'source_required';

export type MasterCapabilityRow = {
  area: string;
  status: MatrixPresence;
  note: string;
};

/** Snapshot of product vs documented Master extracts (V5.4-level + Premium R01.2 explicit formulas). */
export function buildMasterCapabilityMatrix(): MasterCapabilityRow[] {
  return [
    {
      area: 'فرمول حباب طلا / فاصله دلار ضمنی',
      status: 'present',
      note: 'در live-bubbles، market-indicators و ماشین‌حساب تأییدشده اجرا می‌شود.',
    },
    {
      area: 'فرمول نقره V5.4-SILVER.1',
      status: 'present',
      note: 'در کاتالوگ و live bubbles فعال است.',
    },
    {
      area: 'دلار مبتنی بر درهم (USD_AED_GAP)',
      status: 'present',
      note: 'Premium R01.2 صریح: V5.7-USD_AED_GAP.1 با پگ نسخه‌دار USD_AED.',
    },
    {
      area: 'مرجع نظری امارات / اختلاف ایران',
      status: 'present',
      note: 'Premium R01.2 صریح: V5.7-UAE18K.1 — مرجع نظری است نه خرده‌فروشی دبی.',
    },
    {
      area: 'لبهٔ تبدیل نظری طلا/نقره',
      status: 'present',
      note: 'V5.7-GS-RATIO.1؛ سوآپ اجرایی منتشر نشده.',
    },
    {
      area: 'سکه (حباب / مرجع)',
      status: 'absent',
      note: 'قیمت تابلو ممکن است باشد؛ وزن/عیار/حق ضرب و قواعد ZSA-COIN-001 کامل نیست (SPEC_BLOCKER).',
    },
    {
      area: 'SwapEdge اجرایی',
      status: 'absent',
      note: 'نسبت طلا/نقره نظری محاسبه می‌شود؛ تبدیل قابل اجرا منتشر نشده.',
    },
    {
      area: 'روند قیمت (GAP_TREND / RSI)',
      status: 'source_required',
      note: 'تاریخچهٔ محصول 1D است؛ روش مصوب روند/RSI در مخزن نیست؛ به گزارش وصل نشده.',
    },
    {
      area: 'موتور تصمیم BUY/SELL/HOLD',
      status: 'source_required',
      note: 'analysis-engine-status: inactive؛ بدون Master تأییدشده سیگنال صادر نمی‌شود.',
    },
    {
      area: 'اعلان / هشدار تغییر بازار',
      status: 'partial',
      note: 'اعلان داخل سایت + ارزیابی سرور پس از ingestion؛ جدا از تأیید معامله؛ Push/SMS نیازمند سرویس.',
    },
    {
      area: 'Master Prompt فایل V5.7',
      status: 'absent',
      note: 'فایل Master V5.7 در ریپو نیست؛ فقط فرمول‌های صریح Premium R01.2 پیاده شده‌اند.',
    },
  ];
}

/** Customer-facing: only show change monitoring when the real feature is live. */
export function canShowChangeMonitoringToCustomer() {
  return true; // in-app market-change alerts are implemented
}

/** Never promise opportunity engine while decision engine is inactive. */
export function canMarketOpportunityEngine() {
  return false;
}
