import { getWarningPolicy, analysisUserId, acknowledgedRequest } from '@/server/time-reliability';
import { timeReliability } from '@/lib/time-reliability';
import { AnalysisReliabilityWarning } from '@/components/analysis-reliability-warning';
import Link from 'next/link';
import { analysisTrial } from '@/server/analysis-trial';
import { TrialCountdown } from '@/components/trial-countdown';
import { startAnalysisTrial } from '../actions';
import { PendingButton } from '@/components/pending-button';
import { notFound } from 'next/navigation';
import { instruments, formatPrice } from '@/lib/market';
import { getPublicSnapshot } from '@/server/quotes';
import { computeLiveBubbles } from '@/server/live-bubbles';
import { RelativeTime } from '@/components/relative-time';
import { ChartWorkspace } from '@/components/chart-workspace';

export const dynamic = 'force-dynamic';
export default async function AnalysisPage({ params, searchParams }: { params: Promise<{ symbol: string }>; searchParams: Promise<{ trial?: string; request?: string; warning?: string }> }) {
  const { symbol } = await params;
  const asset = instruments.find(item => item.symbol.toLowerCase() === symbol);
  if (!asset) notFound();
  const query = await searchParams;
  const policy = await getWarningPolicy();
  const reliability = timeReliability(policy);
  if (reliability === 'WARNING') {
    const userId = await analysisUserId();
    if (!await acknowledgedRequest(userId, query.request, symbol, policy.version)) {
      return <AnalysisReliabilityWarning policy={policy} symbol={symbol} loggedIn={Boolean(userId)} error={query.warning}/>;
    }
  }
  const trial = await analysisTrial();
  const trialError = (await searchParams).trial;
  const trialActive = trial.expiresAt !== null && Date.parse(trial.expiresAt) > Date.now();
  const snapshot = await getPublicSnapshot();
  const quote = snapshot.quotes.find(item => item.symbol === asset.symbol);
  const key = symbol === 'gold_melted' || symbol === 'gold_18k' ? 'GOLD_BUBBLE' : symbol === 'usd' ? 'USD_BUBBLE' : symbol === 'silver_999' || symbol === 'xag_usd' ? 'SILVER_BUBBLE' : null;
  const bubble = computeLiveBubbles(snapshot).find(item => item.key === key);
  const numeric = bubble && (bubble.status === 'ok' || bubble.status === 'stale') && bubble.percent !== null;
  return <main id="main" className="shell content-page analysis-page">
    <nav className="chart-breadcrumb"><Link href="/">خانه</Link><span>/</span><Link href="/markets">قیمت‌ها</Link><span>/ بررسی {asset.name}</span></nav>
    <p className="analysis-warning" role="status">{reliability === 'WARNING' ? 'تحلیل خارج از بازه استاندارد' : 'در بازه استاندارد تحلیل'} · زمان تهران</p>
    <p>موتور تحلیل معاملاتی هنوز آماده نیست؛ اطلاعات زیر بررسی پایه قیمت و حباب است.</p>
    <h1>پشت قیمت {asset.name} چه می‌گذرد؟</h1>
    <p className="lead">اول قیمت و فاصله از مبنای محاسباتی؛ سپس مقایسه با گذشته. حباب به‌تنهایی زمان خرید یا فروش را تعیین نمی‌کند.</p>
    <section className="panel analysis-summary"><div className="analysis-metrics"><span className="eyebrow">بررسی پایه · رایگان</span><h2>{asset.name}</h2>
      <dl><div><dt>قیمت دیده‌بان</dt><dd><bdi>{quote ? formatPrice(quote.sell, quote.currency) : 'در انتظار داده'}</bdi><small> / {asset.unit}</small></dd></div><div><dt>{key === 'USD_BUBBLE' ? 'فاصله دلار با دلار ضمنی طلا' : 'فاصله با ارزش محاسباتی'}</dt><dd>{numeric ? <bdi>{new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(bubble.percent!)}٪</bdi> : bubble?.status === 'blocked' ? 'مدل هنوز تأیید نشده' : 'محاسبه در دسترس نیست'}</dd></div></dl>
      </div><div className="analysis-context">
      {quote && <p>زمان مشاهده: <RelativeTime value={quote.observedAt} /></p>}
      {bubble?.status === 'stale' && <p className="analysis-warning">این محاسبه از داده قدیمی است؛ وضعیت فعلی بازار نیست.</p>}
      <p>{numeric ? key === 'USD_BUBBLE' ? 'این اختلاف، مقایسه دلار بازار با دلار ضمنی طلاست؛ ارزش بنیادی دلار نیست.' : 'این عدد فاصله قیمت طلای ۱۸ عیار مشتق از مظنه با ارزش محاسباتی اونس و دلار را نشان می‌دهد؛ سود قابل تحقق نیست.' : 'در نبود مدل یا ورودی معتبر، نتیجه جایگزین ساخته نمی‌شود.'}</p>
      <details><summary>برای تصمیم چه اطلاعاتی هنوز لازم است؟</summary><p>روند معتبر، هزینه معامله، قیمت قابل اجرا و ریسک شما. موتور توصیه خرید، فروش یا تبدیل هنوز آماده ارائه نیست؛ اشتراک این محدودیت را برطرف نمی‌کند.</p></details>
      </div>
    </section>
    <section className="analysis-upgrade" aria-label="دسترسی آزمایشی">
      <div><h2>{trialActive ? 'فرصت بررسی عمیق‌تر بازار' : 'پیش از اشتراک، خودت بررسی کن.'}</h2>
      {trialActive ? <TrialCountdown expiresAt={trial.expiresAt!} /> : <p>{!trial.available ? 'بررسی دسترسی موقتاً ممکن نیست؛ دوباره تلاش کنید.' : trial.used ? 'دوره آزمایشی این حساب پایان یافته یا غیرفعال شده است. قیمت و بررسی پایه همچنان رایگان است.' : trial.enabled ? `${new Intl.NumberFormat('fa-IR').format(trial.hours)} ساعت دسترسی آزمایشی به تاریخچه ۳۰ روزه قیمت و حباب؛ یک بار برای هر حساب.` : 'دوره آزمایشی فعلاً غیرفعال است؛ بررسی پایه رایگان است.'}</p>}
      {trialError && <p role="alert">شروع دوره ممکن نشد؛ دوباره تلاش کنید.</p>}</div>
      {!trialActive && trial.available && trial.enabled && !trial.used && (trial.loggedIn ? <form action={startAnalysisTrial}><input type="hidden" name="symbol" value={symbol}/><PendingButton className="button" pendingText="در حال فعال‌سازی…">شروع دسترسی آزمایشی</PendingButton></form> : <Link className="button" href={`/login?next=${encodeURIComponent(`/analysis/${symbol}`)}`}>ورود برای شروع دوره رایگان</Link>)}
      {!trialActive && trial.used && <Link className="button" href="/pricing">ادامه با اشتراک</Link>}
    </section>
    <ChartWorkspace key={trialActive ? trial.expiresAt : 'standard'} symbol={asset.symbol} />
    <div className="home-quick-tools"><Link href="/calculator">ماشین‌حساب</Link><Link href={`/markets/${symbol}`}>مشخصات و قیمت بازار</Link><Link href="/methodology">روش محاسبه</Link></div>
  </main>;
}
