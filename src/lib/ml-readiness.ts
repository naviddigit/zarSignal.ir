/**
 * ML readiness note — no demo model shipped.
 * User ratings of narrative text are not trade-outcome labels.
 */

export type MlReadiness = {
  historyAvailable: 'partial' | 'insufficient' | 'unknown';
  dataQuality: string;
  predictionTarget: string | null;
  outcomeLabels: string | null;
  temporalEval: string;
  vsBaseline: string;
  recommendation: 'do_not_ship' | 'offline_experiment_only';
  notes: string[];
};

export function assessMlReadiness(): MlReadiness {
  return {
    historyAvailable: 'partial',
    dataQuality:
      'MarketQuote و BubbleSnapshot موجودند؛ هم‌زمانی ورودی‌ها و تازگی باید برای هر نمونه کنترل شود. پر کردن شکاف تاریخچه ممنوع است.',
    predictionTarget: null,
    outcomeLabels: null,
    temporalEval:
      'هر ارزیابی باید بدون نشت آینده و با هزینهٔ معامله باشد؛ شروع مناسب آزمایش آفلاین بدون صدور سیگنال به مشتری است.',
    vsBaseline:
      'تا وقتی هدف پیش‌بینی و برچسب نتیجهٔ معامله تعریف نشده، مدل نسبت به قاعدهٔ سادهٔ پایه ارزش افزودهٔ اثبات‌شده ندارد.',
    recommendation: 'do_not_ship',
    notes: [
      'امتیاز کاربران به متن گزارش، برچسب موفقیت معامله محسوب نمی‌شود.',
      'مدل نمایشی به محصول اضافه نشده است.',
      'موتور تصمیم و فرصت‌یابی برای مشتری وعده داده نمی‌شود تا قرارداد اجرایی تأیید شود.',
    ],
  };
}
