import { getWarningPolicy } from '@/server/time-reliability';
import { getAnalysisReadingSettings } from '@/server/analysis-reading-settings';
import { getCalculatorAccessPolicy } from '@/server/calculator-access';
import { AnalysisTimeSettings } from '@/components/analysis-time-settings';
import { AnalysisReadingSettingsForm } from '@/components/analysis-reading-settings';
import { CalculatorAccessSettingsForm } from '@/components/calculator-access-settings';
import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';

export const dynamic = 'force-dynamic';

export default async function AnalysisSettingsPage() {
  const [policy, reading, calcAccess, audits] = await Promise.all([
    getWarningPolicy(),
    getAnalysisReadingSettings(),
    getCalculatorAccessPolicy(),
    withDeadline(db.analysisPolicyAudit.findMany({ take: 10, orderBy: { timestamp: 'desc' } }), 2000).catch(() => []),
  ]);
  const { available: calcAvailable, writable: calcWritable, ...calcPolicy } = calcAccess;

  return (
    <>
      <header className="admin-title">
        <div>
          <span className="eyebrow">تنظیمات تحلیل</span>
          <h1>بازه اعتبار، سرعت خواندن و دسترسی ماشین‌حساب</h1>
          <p>زمان تهران · سرعت واقعی بر حسب نویسه در ثانیه · entitlement یکسان در صفحه و API</p>
        </div>
      </header>

      <section className="admin-card">
        <h2>سرعت خواندن گزارش</h2>
        <p>سرعت پایه، ضریب حالت سریع و فاصلهٔ ظهور بخش‌ها. شتاب پنهان بر اساس طول گزارش اعمال نمی‌شود.</p>
        <AnalysisReadingSettingsForm settings={reading} />
      </section>

      <section className="admin-card">
        <h2>دسترسی ماژول‌های ماشین‌حساب</h2>
        <p>برای هر ماژول: رایگان، پلن‌های مجاز، یا غیرفعال. مسیر: ادمین → تنظیمات تحلیل. پیش‌فرض همه رایگان است.</p>
        <CalculatorAccessSettingsForm
          policy={calcPolicy}
          available={calcAvailable}
          writable={calcWritable}
        />
      </section>

      <section className="admin-card">
        <div className="reliability-periods">
          <p>بازه استاندارد تحلیل<strong><bdi>{policy.warningEnd} تا {policy.warningStart}</bdi></strong></p>
          <p>بازه نیازمند هشدار<strong><bdi>{policy.warningStart} تا {policy.warningEnd}</bdi></strong></p>
          <p>منطقه زمانی<strong>تهران</strong><small dir="ltr">Asia/Tehran</small></p>
        </div>
        {policy.fallback && (
          <p role="status">پیش‌فرض مصوب فعال است؛ هنوز تنظیم معتبر ذخیره‌شده‌ای دریافت نشده است.</p>
        )}
        <AnalysisTimeSettings policy={policy} />
      </section>

      <section className="admin-card">
        <h2>سابقه تغییرات بازه اعتبار</h2>
        {audits.length ? audits.map(audit => (
          <details key={audit.id}>
            <summary>
              {new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'short', timeStyle: 'medium' }).format(audit.timestamp)}
              {' · '}{audit.actor}
            </summary>
            <p>نسخه: <bdi>{audit.policyVersion}</bdi></p>
            <pre className="policy-audit-json" dir="ltr">{JSON.stringify({ previous: audit.previousValue, next: audit.newValue }, null, 2)}</pre>
          </details>
        )) : <p>سابقه‌ای دریافت نشد.</p>}
      </section>
    </>
  );
}
