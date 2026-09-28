import { getHomeContent } from '@/server/home-content';
import { homeSections, homeTexts } from '@/lib/home-content';
import { Checkbox } from '@/components/ui/checkbox';
import { PendingButton } from '@/components/pending-button';
import { Field } from '@/components/ui/field';
import { saveHomeContent } from './actions';
export const dynamic = 'force-dynamic';
export default async function ContentAdmin({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}) {
  const [content,params] = await Promise.all([getHomeContent(),searchParams]);
  return <><header className="admin-title"><div><span className="eyebrow">محتوای سایت</span><h1>صفحه اصلی</h1><p>متن‌ها و نمایش بخش‌ها را مدیریت کنید. تغییرات پس از ذخیره روی سایت اعمال می‌شوند.</p></div></header>
    {params.saved && <p role="status" className="admin-message is-ok">تغییرات صفحه اصلی ذخیره شد.</p>}
    {params.error && <p role="alert" className="admin-message">{params.error==='invalid'?'متن‌ها نباید خالی یا بیشتر از ۳۰۰ نویسه باشند.':'ذخیره انجام نشد؛ اتصال پایگاه داده را بررسی کنید.'}</p>}
    <form action={saveHomeContent}><section className="admin-card"><h2>بخش‌های قابل نمایش</h2><div className="content-section-switches">{(Object.entries(homeSections) as [keyof typeof homeSections,string][]).map(([key,label])=><Checkbox key={key} name={`show-${key}`} label={label} defaultChecked={content.sections[key]}/>)}</div></section>
    <section className="admin-card content-editor"><h2>متن‌های صفحه</h2><p>فقط متن وارد کنید؛ کد HTML اجرا نمی‌شود. امکاناتی را معرفی کنید که واقعاً در دسترس‌اند.</p><div className="content-editor-fields">{(Object.entries(homeTexts) as [keyof typeof homeTexts,readonly [string,string]][]).map(([key,[label]])=><Field key={key} label={label}><textarea className="ds-input" name={key} rows={key.endsWith('Body')||key==='description'?3:2} maxLength={300} defaultValue={content.texts[key]} required/></Field>)}</div><PendingButton className="button" pendingText="در حال ذخیره…">ذخیره و انتشار متن‌ها</PendingButton></section></form></>;
}
