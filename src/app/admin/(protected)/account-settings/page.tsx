import { getAccountPolicy } from '@/server/account-policy';
import { profileFields } from '@/lib/account-policy';
import { Checkbox } from '@/components/ui/checkbox';
import { saveAccountPolicy } from './actions';
import '../admin-settings.css';

export const dynamic = 'force-dynamic';
export default async function AccountSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [policy, params] = await Promise.all([getAccountPolicy(), searchParams]);
  return <>
    <header className="admin-title"><div><span className="eyebrow">ACCOUNT SETTINGS</span><h1>تنظیمات حساب و ثبت‌نام</h1><p>تأیید ایمیل و فیلدهای اجباری پروفایل را مدیریت کنید.</p></div></header>
    <form className="admin-card maintenance-admin-form" action={saveAccountPolicy}>
      <h2>تأیید ایمیل</h2>
      <Checkbox name="emailVerificationRequired" label="تأیید ایمیل برای ورود با رمز عبور اجباری باشد" defaultChecked={policy.emailVerificationRequired} />
      <p>کد شش‌رقمی با اعتبار ۱۰ دقیقه از Resend ارسال می‌شود. ورود گوگل از تأیید ایمیل خود گوگل استفاده می‌کند.</p>
      <h2>تکمیل پروفایل</h2>
      <Checkbox name="profileRequired" label="تکمیل پروفایل اجباری باشد" defaultChecked={policy.profileRequired} />
      <p>فیلدهای لازم؛ دیگر فیلدها اختیاری می‌مانند. این تنظیم برای حساب‌های موجود نیز اعمال می‌شود.</p>
      {Object.entries(profileFields).map(([key, label]) => <Checkbox key={key} name="requiredFields" value={key} label={label} defaultChecked={policy.requiredFields.some(field => field === key)} />)}
      <button className="button" type="submit">ذخیره تنظیمات</button>
      {params.saved && <p role="status">تنظیمات ذخیره شد.</p>}
      {params.error && <p className="form-error" role="alert">{params.error}</p>}
    </form>
  </>;
}
