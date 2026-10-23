import Link from 'next/link';
import { ArrowUpLeft, LockKeyhole } from 'lucide-react';

/** Server-rendered wall for visitors who have not signed in. */
export function AnalysisRegistrationGate({ returnTo }: { returnTo: string }) {
  const next = encodeURIComponent(returnTo);
  return (
    <main id="main" className="shell content-page analysis-page analysis-registration-gate">
      <section className="panel" aria-labelledby="analysis-registration-title">
        <span className="analysis-registration-gate__icon"><LockKeyhole size={22} aria-hidden="true" /></span>
        <span className="eyebrow">تحلیل پیشرفته زرسیگنال</span>
        <h1 id="analysis-registration-title">برای مشاهدهٔ تحلیل، وارد حساب شوید</h1>
        <p>گزارش تحلیل پیشرفته پس از ثبت‌نام یا ورود به حساب نمایش داده می‌شود. اگر حساب ندارید، می‌توانید همین‌جا رایگان ثبت‌نام کنید و سپس به این تحلیل برگردید.</p>
        <div className="analysis-registration-gate__actions">
          <Link className="button" href={`/login?mode=register&next=${next}`}>ثبت‌نام و مشاهدهٔ تحلیل <ArrowUpLeft size={16} aria-hidden="true" /></Link>
          <Link className="text-link" href={`/login?next=${next}`}>قبلاً حساب دارید؟ ورود</Link>
        </div>
      </section>
    </main>
  );
}
