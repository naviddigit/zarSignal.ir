import Link from 'next/link';
import { analysisTrial } from '@/server/analysis-trial';
import { TrialCountdown } from '@/components/trial-countdown';
import { PendingButton } from '@/components/pending-button';
import { startAnalysisTrial } from '@/app/analysis/actions';

export function AnalysisTrialAccess({ trial, symbol = '', error }: {
  trial: Awaited<ReturnType<typeof analysisTrial>>;
  symbol?: string;
  error?: string;
}) {
  const active = trial.expiresAt !== null && Date.parse(trial.expiresAt) > Date.now();
  const path = symbol ? `/analysis/${symbol}` : '/analysis';
  return <section className="analysis-upgrade" aria-label="دسترسی آزمایشی">
    <div>
      <h2>{active ? 'دسترسی آزمایشی شما فعال است' : 'تحلیل کامل را رایگان امتحان کنید'}</h2>
      {active ? <TrialCountdown expiresAt={trial.expiresAt!} /> : <p>
        {!trial.available ? 'بررسی دسترسی موقتاً ممکن نیست؛ دوباره تلاش کنید.'
          : trial.used ? 'دورهٔ آزمایشی این حساب پایان یافته یا غیرفعال شده است. قیمت و خلاصهٔ بازار همچنان رایگان‌اند.'
          : trial.enabled ? `${new Intl.NumberFormat('fa-IR').format(trial.hours)} ساعت برای خواندن گزارش کامل بازار، تحلیل نمادها و تاریخچهٔ ۳۰ روزه؛ یک بار برای هر حساب، از لحظهٔ شروع.`
          : 'دورهٔ آزمایشی فعلاً غیرفعال است؛ قیمت و خلاصهٔ بازار رایگان‌اند.'}
      </p>}
      {error && <p role="alert">شروع دوره ممکن نشد؛ دوباره تلاش کنید.</p>}
    </div>
    {!active && trial.available && trial.enabled && !trial.used && (trial.loggedIn
      ? <form action={startAnalysisTrial}><input type="hidden" name="symbol" value={symbol} /><PendingButton className="button" pendingText="در حال فعال‌سازی…">شروع استفاده رایگان</PendingButton></form>
      : <Link className="button" href={`/login?next=${encodeURIComponent(path)}`}>ورود برای شروع استفاده رایگان</Link>)}
    {!active && trial.used && <Link className="button" href="/pricing">ادامه با اشتراک</Link>}
  </section>;
}
