import { getWarningPolicy } from '@/server/time-reliability';
import { AnalysisTimeSettings } from '@/components/analysis-time-settings';
import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';
export const dynamic = 'force-dynamic';
export default async function AnalysisSettingsPage() {
  const policy = await getWarningPolicy();
  const audits = await withDeadline(db.analysisPolicyAudit.findMany({ take: 10, orderBy: { timestamp: 'desc' } }), 2000).catch(() => []);
  return <><header className="admin-title"><div><span className="eyebrow">اعتبار زمانی</span><h1>بازه اعتبار تحلیل</h1><p>زمان تهران · مستقل از اطمینان موتور و کیفیت داده</p></div></header>
    <section className="admin-card"><div className="reliability-periods"><p>بازه استاندارد تحلیل<strong><bdi>{policy.warningEnd} تا {policy.warningStart}</bdi></strong></p><p>بازه نیازمند هشدار<strong><bdi>{policy.warningStart} تا {policy.warningEnd}</bdi></strong></p><p>منطقه زمانی<strong>تهران</strong><small dir="ltr">Asia/Tehran</small></p></div>
    {policy.fallback && <p role="status">پیش‌فرض مصوب فعال است؛ هنوز تنظیم معتبر ذخیره‌شده‌ای دریافت نشده است.</p>}
    <AnalysisTimeSettings policy={policy}/></section>
    <section className="admin-card"><h2>سابقه تغییرات</h2>{audits.length ? audits.map(audit => <details key={audit.id}><summary>{new Intl.DateTimeFormat('fa-IR',{timeZone:'Asia/Tehran',dateStyle:'short',timeStyle:'medium'}).format(audit.timestamp)} · {audit.actor}</summary><p>نسخه: <bdi>{audit.policyVersion}</bdi></p><pre className="policy-audit-json" dir="ltr">{JSON.stringify({previous: audit.previousValue, next: audit.newValue},null,2)}</pre></details>) : <p>سابقه‌ای دریافت نشد.</p>}</section>
  </>;
}
