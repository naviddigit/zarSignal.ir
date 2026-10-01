import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  ArrowUpLeft,
  BookOpen,
  Calculator,
  CircleAlert,
  Clock3,
  Scale,
  ShieldCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'آموزش بازار طلا و شفافیت داده | زر‌سیگنال',
  description:
    'یاد بگیرید قیمت طلا، مظنه، حباب و تازگی داده را درست بخوانید؛ بدون توصیه خرید یا فروش.',
  alternates: { canonical: '/methodology' },
};

const lessons = [
  {
    Icon: Clock3,
    title: 'تازگی داده یعنی چه؟',
    body: 'دریافت تازه، قیمت قدیمی را تازه نمی‌کند. زمان مشاهده در منبع از زمان دریافت زر‌سیگنال جداست؛ اگر یکی از این‌ها کهنه باشد، عدد را با احتیاط بخوانید.',
  },
  {
    Icon: Scale,
    title: 'واحد را قبل از مقایسه چک کنید',
    body: 'مثقال، گرم، اونس و تومان با هم یکی نیستند. بدون واحد یکسان، مقایسه قیمت‌ها گمراه‌کننده است — حتی اگر عددها شبیه باشند.',
  },
  {
    Icon: Activity,
    title: 'حباب عدد است، نه سیگنال معامله',
    body: 'حباب طلا فاصلهٔ قیمت بازار با ارزش محاسباتی است. مثبت، منفی یا خنثی به‌تنهایی پیشنهاد خرید یا فروش نیست و محدودهٔ خنثی هنوز به‌صورت برچسب نمایش داده نمی‌شود.',
  },
  {
    Icon: ShieldCheck,
    title: 'کنترل کیفیت قبل از نمایش',
    body: 'قیمت منفی، خرید بالاتر از فروش، یا دادهٔ ناقص ذخیره نمی‌شود. اگر دریافت fail شود، عدد ساختگی جایگزین نمی‌شود.',
  },
] as const;

const rules = [
  'قیمت‌ها از لایهٔ دادهٔ داخلی می‌آیند؛ نام تأمین‌کنندهٔ بالادستی در سایت عمومی نمایش داده نمی‌شود.',
  'دلار، یورو و درهم با واحد تومان؛ اونس جهانی طلا و نقره با دلار برای هر اونس تروا.',
  'مظنهٔ آب‌شده با مثقال ۷۰۵ نگه‌داری می‌شود؛ تبدیل‌های تأییدنشده بین بازارها انجام نمی‌شود.',
  'خروجی ابزارها برای مشاهده بازار و نظم شخصی است — نه توصیهٔ شخصی سرمایه‌گذاری.',
] as const;

export default function Methodology() {
  return (
    <main id="main" className="shell content-page edu-page">
      <span className="eyebrow">آموزش · روش داده</span>
      <h1>بازار را درست بخوان؛ نه فقط عدد را.</h1>
      <p className="lead">
        زر‌سیگنال قیمت، زمان و واحد را شفاف نگه می‌دارد تا تصمیم‌تان روی دادهٔ قابل‌فهم باشد — نه روی حدس و شایعه.
      </p>

      <nav className="edu-quick" aria-label="مسیرهای آموزشی">
        <Link href="/faq">
          <BookOpen size={18} strokeWidth={1.9} />
          <span>
            <strong>پرسش‌های متداول</strong>
            <small>منبع، بروزرسانی، حباب</small>
          </span>
          <ArrowUpLeft size={16} />
        </Link>
        <Link href="/risk-management">
          <ShieldCheck size={18} strokeWidth={1.9} />
          <span>
            <strong>مدیریت سرمایه</strong>
            <small>ریسک را اندازه بگیر</small>
          </span>
          <ArrowUpLeft size={16} />
        </Link>
        <Link href="/calculator">
          <Calculator size={18} strokeWidth={1.9} />
          <span>
            <strong>ماشین‌حساب</strong>
            <small>مظنه، وزن، عیار</small>
          </span>
          <ArrowUpLeft size={16} />
        </Link>
      </nav>

      <section className="edu-lessons" aria-label="درس‌های کلیدی">
        {lessons.map(item => {
          const Icon = item.Icon;
          return (
            <article key={item.title} className="edu-lesson">
              <span className="edu-lesson__icon" aria-hidden="true">
                <Icon size={20} strokeWidth={1.8} />
              </span>
              <div>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="edu-rules panel">
        <header>
          <CircleAlert size={18} strokeWidth={1.9} aria-hidden="true" />
          <h2>قواعد شفافیت زر‌سیگنال</h2>
        </header>
        <ul>
          {rules.map(rule => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <p className="edu-foot">
        خروجی‌ها پیشنهاد خرید یا فروش نیستند. قبل از هر تصمیم، واحد، زمان و محدودیت مدل را بخوانید.
      </p>
    </main>
  );
}
