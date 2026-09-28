import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { PendingButton } from '@/components/pending-button';
import type { WarningPolicy } from '@/lib/time-reliability';
import { acceptAnalysisWarning } from '@/app/analysis/actions';
export function AnalysisReliabilityWarning({ policy, symbol, loggedIn, error }: { policy: WarningPolicy; symbol: string; loggedIn: boolean; error?: string }) {
  return <main id="main" className="shell content-page analysis-page"><section className="panel reliability-warning" aria-labelledby="warning-title">
    <ShieldAlert size={30} aria-hidden="true"/><span className="eyebrow">زمان تهران</span><h1 id="warning-title">هشدار اعتبار تحلیل</h1>
    <p>در این بازه زمانی نرخ‌های اصلی بازار ممکن است هنوز از اعتبار و ثبات کافی برای تحلیل استاندارد برخوردار نباشند.</p>
    <p>بازه اصلی و قابل اتکاتر تحلیل زرسیگنال از ساعت <bdi>{policy.warningEnd}</bdi> تا <bdi>{policy.warningStart}</bdi> به وقت تهران است.</p>
    {error && <p role="alert">پذیرش ثبت نشد یا سیاست تغییر کرده است؛ دوباره بررسی و تلاش کنید.</p>}
    {loggedIn ? <form action={acceptAnalysisWarning}><input type="hidden" name="symbol" value={symbol}/><input type="hidden" name="policyVersion" value={policy.version}/><input type="hidden" name="acknowledge" value="yes"/><PendingButton className="button" pendingText="در حال ثبت پذیرش…">مشاهده تحلیل با پذیرش هشدار</PendingButton></form> : <><Link className="button" href={`/login?next=${encodeURIComponent(`/analysis/${symbol}`)}`}>ورود برای پذیرش هشدار</Link></>}
    <Link className="text-link" href={`/markets/${symbol}`}>فعلاً نمایش نده</Link>
  </section></main>;
}
