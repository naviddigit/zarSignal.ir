/**
 * Honest Master / product matrix — only from what exists in this repo.
 * Do not invent V5.7 rules from chat samples; Master Prompt V5.7 is not in the tree.
 */

export type MatrixPresence = 'present' | 'partial' | 'absent' | 'source_required';

export type MasterCapabilityRow = {
  area: string;
  status: MatrixPresence;
  note: string;
};

/** Snapshot of product vs documented Master extracts (V5.4-level + local code). */
export function buildMasterCapabilityMatrix(): MasterCapabilityRow[] {
  return [
    {
      area: 'فرمول حباب طلا / فاصله دلار ضمنی',
      status: 'present',
      note: 'در live-bubbles و ماشین‌حساب تأییدشده اجرا می‌شود (نسخهٔ فرمول محصول).',
    },
    {
      area: 'فرمول نقره V5.4-SILVER.1',
      status: 'present',
      note: 'در کاتالوگ و live bubbles فعال است.',
    },
    {
      area: 'سکه (حباب / مرجع)',
      status: 'absent',
      note: 'قیمت تابلو ممکن است باشد؛ مرجع محاسباتی سکه تأیید نشده (SPEC_BLOCKER).',
    },
    {
      area: 'ایران / امارات (جداسازی بازار)',
      status: 'source_required',
      note: 'قواعد جداگانهٔ ایران/امارات در مخزن به‌عنوان Master اجرایی نیست.',
    },
    {
      area: 'SwapEdge اجرایی',
      status: 'absent',
      note: 'نسبت طلا/نقره فقط در نثر مقایسه می‌آید؛ تبدیل قابل اجرا منتشر نشده.',
    },
    {
      area: 'روند قیمت (GAP_TREND)',
      status: 'source_required',
      note: 'قابلیت در ماتریس پلن source_required است؛ به گزارش وصل نشده.',
    },
    {
      area: 'موتور تصمیم BUY/SELL/HOLD',
      status: 'source_required',
      note: 'analysis-engine-status: inactive؛ بدون Master تأییدشده سیگنال صادر نمی‌شود.',
    },
    {
      area: 'اعلان / هشدار تغییر بازار',
      status: 'partial',
      note: 'اعلان داخل سایت + ارزیابی سرور پس از ingestion؛ Push/SMS نیازمند سرویس.',
    },
    {
      area: 'Master Prompt فایل V5.7',
      status: 'absent',
      note: 'فایل Master V5.7 در ریپو نیست؛ قواعد مفقود از چت حدس زده نمی‌شوند.',
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
