import { Activity } from 'lucide-react';
import Link from 'next/link';
import { auth, signIn, signOut } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await auth();
  return <main id="main" className="auth-page"><section className="auth-card"><Link href="/" className="brand"><span className="brand-mark"><Activity size={26}/></span><span>زر<span className="gold-text">سیگنال</span></span></Link>{session?.user ? <><h1>خوش آمدید</h1><p>{session.user.email}</p><form action={async()=>{'use server';await signOut({redirectTo:'/'});}}><button className="button" type="submit">خروج از حساب</button></form></> : <><span className="eyebrow gold-text">حساب کاربری زرسیگنال</span><h1>ورود امن و سریع</h1><p>برای مدیریت اشتراک، هشدارها و کلیدهای API با حساب گوگل وارد شوید.</p><form action={async()=>{'use server';await signIn('google',{redirectTo:'/'});}}><button className="google-button" type="submit"><b>G</b> ادامه با گوگل</button></form><small>با ورود، قوانین استفاده و حریم خصوصی زرسیگنال را می‌پذیرید.</small></>}</section></main>;
}
