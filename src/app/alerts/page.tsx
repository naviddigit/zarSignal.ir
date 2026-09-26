import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'وضعیت هشدارهای من' };

export default function AlertsPage() {
  return <main id="main" className="shell content-page"><h1>هشدارهای من</h1><section className="panel"><h2>هشدار شخصی هنوز فعال نیست</h2><p>امکان ذخیره شرط هشدار و ارسال پیامک یا واتساپ در نسخه فعلی ارائه نمی‌شود. خرید اشتراک این سرویس را فعال نمی‌کند.</p><p>هشدار آستانه قیمت و تغییر تحلیل مدل دو خدمت متفاوت‌اند؛ موتور تصمیم معاملاتی نیز هنوز فعال نیست.</p><Link className="button" href="/#analysis">بازگشت به وضعیت داده بازار</Link></section></main>;
}
