import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpLeft } from 'lucide-react';

export const metadata: Metadata = { title: 'مستندات API', alternates: { canonical: '/developers' } };

export default function Developers() {
  return (
    <main id="main" className="shell content-page">
      <span className="eyebrow">BUILT FOR BUILDERS</span>
      <h1>دادهٔ روشن. اتصال ساده.</h1>
      <p className="lead">
        قرارداد API زر‌سیگنال: قیمت اعشاری به شکل رشته، واحد صریح و زمان UTC.
        برای استفاده تجاری، پلن API را از صفحه اشتراک بگیرید.
      </p>

      <div className="membership-funnel" style={{ marginBottom: 24 }}>
        <Link className="button" href="/pricing#api-plans">خرید / درخواست پلن API <ArrowUpLeft size={16} /></Link>
        <Link className="text-link" href="/markets">دیدن داده رایگان سایت</Link>
      </div>

      <section className="panel">
        <h2>دیده‌بان عمومی (رایگان سایت)</h2>
        <pre>{`GET /api/public/markets

{
  "mode": "live",
  "status": "ok",
  "quotes": [{
    "symbol": "USD",
    "buy": "98500",
    "sell": "99100",
    "currency": "TMN",
    "unit": "دلار",
    "source": "زرسیگنال",
    "sourceUrl": null,
    "observedAt": "2026-09-01T09:00:00.000Z",
    "fetchedAt": "2026-09-01T09:00:00.000Z"
  }]
}`}</pre>
        <p>این endpoint برای خود سایت است و جایگزین پلن API تجاری نیست. TMN = تومان.</p>
      </section>

      <section className="panel">
        <h2>API تجاری با کلید و سهمیه</h2>
        <pre>{`GET /api/v1/quotes
Authorization: Bearer zs_<your-secret-key>

GET /api/v1/analysis
Authorization: Bearer zs_<your-secret-key>`}</pre>
        <p>کلید باید معتبر، منقضی‌نشده و دارای اشتراک فعال api باشد. سهمیه روزانه بر اساس UTC شمارش می‌شود.</p>
        <ul>
          <li>401: کلید نامعتبر یا منقضی</li>
          <li>403: اشتراک API فعال نیست</li>
          <li>429: سهمیه روزانه تمام شده</li>
          <li>503: داده آماده نیست یا فرمول متصل نشده</li>
        </ul>
        <Link className="button" href="/pricing#api-plans">رفتن به پلن API <ArrowUpLeft size={16} /></Link>
      </section>
    </main>
  );
}
