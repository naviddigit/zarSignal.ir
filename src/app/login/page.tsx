import { Activity, Mail, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { auth, authCapabilities, signIn, signOut } from '@/auth';
import { PendingButton } from '@/components/pending-button';
export const dynamic='force-dynamic';
export default async function LoginPage(){
 const session=await auth().catch(()=>null);
 return <main id="main" className="auth-page"><section className="auth-card">
  <Link href="/" className="brand"><span className="brand-mark"><Activity size={26}/></span><span>زر<span className="gold-text">سیگنال</span></span></Link>
  {session?.user?<><h1>خوش آمدید</h1><p>{session.user.email??session.user.name}</p><form action={async()=>{'use server';await signOut({redirectTo:'/'});}}><PendingButton pendingText="در حال خروج…">خروج از حساب</PendingButton></form></>:<>
   <span className="eyebrow gold-text">حساب کاربری زرسیگنال</span><h1>ورود امن و سریع</h1><p>برای مدیریت اشتراک، هشدارها و کلیدهای API وارد حساب خود شوید.</p>
   <div className="auth-methods">
    {authCapabilities.google?<form action={async()=>{'use server';await signIn('google',{redirectTo:'/'});}}><PendingButton className="google-button" pendingText="در حال اتصال…"><b>G</b> ادامه با گوگل</PendingButton></form>:<div className="auth-unavailable"><Mail size={18}/><div><strong>ورود با گوگل</strong><small>شناسه و کلید Google هنوز در محیط اجرا تنظیم نشده‌اند.</small></div></div>}
    <div className="auth-divider"><span>یا</span></div>
    <form className="phone-login" action="#"><label htmlFor="mobile">شماره موبایل</label><div className="phone-field"><Smartphone size={18}/><input id="mobile" name="mobile" inputMode="tel" autoComplete="tel" placeholder="۰۹۱۲۱۲۳۴۵۶۷" disabled={!authCapabilities.phone}/></div><button className="button" type="submit" disabled={!authCapabilities.phone}>دریافت کد ورود</button>{!authCapabilities.phone&&<small className="auth-config-note">سرویس پیامک هنوز متصل نشده است. پس از ثبت کلید سرویس در پنل مدیریت، ورود موبایل فعال می‌شود.</small>}</form>
   </div><small>با ورود، قوانین استفاده و حریم خصوصی زرسیگنال را می‌پذیرید.</small>
  </>}
 </section></main>
}
