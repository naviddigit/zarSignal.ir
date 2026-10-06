import type { Metadata } from 'next';
import { ProfessionalCalculator } from '@/components/professional-calculator';
import { FunnelTrack } from '@/components/funnel-track';
import { getPublicSnapshot } from '@/server/quotes';
import { getCalculatorAccessPolicy } from '@/server/calculator-access';
import { getCalculatorNavigation } from '@/server/calculator-navigation';
import { resolveAccountEntitlement } from '@/server/account-entitlement';
import { auth } from '@/auth';
import './calculator.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'ماشین‌حساب حرفه‌ای طلا، نقره، سکه و ارز',
  description: 'تبدیل مثقال، قیمت ۱۸ عیار و محاسبه حباب طلا با ورودی دستی یا زنده و جزئیات منبع و نسخه.',
  alternates: { canonical: '/calculator' },
};

export default async function CalculatorPage() {
  const session = await auth().catch(() => null);
  const [snapshot, calcAccess, navigation, entitlement] = await Promise.all([
    getPublicSnapshot(),
    getCalculatorAccessPolicy(),
    getCalculatorNavigation(),
    session?.user?.id
      ? resolveAccountEntitlement(session.user.id).catch(() => null)
      : Promise.resolve(null),
  ]);
  const { available, writable: _writable, ...policy } = calcAccess;

  return (
    <main id="main" className="shell professional-page calc-app-page">
      <FunnelTrack event="calculator_open" />
      <header className="calc-app-page__intro">
        <span className="eyebrow">ZARSIGNAL CALCULATOR</span>
        <h1>هر محاسبه، با ورودی روشن.</h1>
        <p>محاسبه را انتخاب کنید، قیمت را وارد یا از بازار دریافت کنید و نتیجه را ببینید.</p>
      </header>
      <ProfessionalCalculator
        snapshot={snapshot}
        accessPolicy={policy}
        navigation={navigation}
        accessAvailable={available}
        accessLevel={entitlement?.level ?? 'FREE'}
        statusLabel={entitlement?.statusLabel ?? 'رایگان'}
      />
    </main>
  );
}
