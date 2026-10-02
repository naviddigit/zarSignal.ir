/** Honest matrix of plan capabilities vs product readiness — no new paid features activated here. */

import {
  CAPABILITY_META,
  capabilitiesFor,
  type AccessLevel,
  type Capability,
  type CapabilityProductStatus,
} from '@/lib/capabilities';

export type PlanMatrixRow = {
  capability: Capability;
  label: string;
  productStatus: CapabilityProductStatus;
  inHome: boolean;
  inProfessional: boolean;
  inAdvanced: boolean;
  /** Practical note for sales honesty. */
  note: string;
};

const NOTES: Partial<Record<Capability, string>> = {
  ANALYSIS_BASIC: 'گزارش دید بازار / مقایسهٔ ارزش زنده است.',
  ANALYSIS_FULL: 'موتور تصمیم V5.4 در محصول فعال نیست؛ SOURCE_REQUIRED.',
  CONFIDENCE: 'شاخص اطمینان بدون قرارداد اجرایی عرضه نمی‌شود.',
  GAP_TREND: 'روند Gap به گزارش وصل نشده؛ تاریخچهٔ نمودار جداست.',
  IMPLIED_USD: 'دلار ضمنی در حباب/ماشین‌حساب هست؛ بستهٔ تصمیم کامل نیست.',
  BASIC_ALERTS: 'coming_soon — هنوز کانال اعلان عمومی ندارد.',
  ADVANCED_ALERTS: 'بدون موتور تأییدشده قابل فروش نیست.',
  CALCULATOR_ADVANCED: 'coming_soon.',
  ADVANCED_CHART: 'coming_soon.',
  API_ACCESS: 'لایهٔ API عمومی موجود است؛ از موتور معامله جداست.',
  FUTURE_GOLD: 'SOURCE_REQUIRED.',
  ACCOUNTING: 'SOURCE_REQUIRED.',
};

export function buildPlanCapabilityMatrix(): PlanMatrixRow[] {
  const home = capabilitiesFor('HOME');
  const pro = capabilitiesFor('PROFESSIONAL');
  const adv = capabilitiesFor('ADVANCED_PROFESSIONAL');
  const ids = Array.from(new Set<Capability>([
    ...home,
    ...pro,
    ...adv,
  ]));
  return ids.map(capability => {
    const meta = CAPABILITY_META[capability];
    return {
      capability,
      label: meta.label,
      productStatus: meta.status,
      inHome: home.has(capability),
      inProfessional: pro.has(capability),
      inAdvanced: adv.has(capability),
      note: NOTES[capability]
        ?? (meta.status === 'live' ? 'در محصول موجود است.' : meta.status === 'coming_soon' ? 'در راه — هنوز کامل نیست.' : 'منبع تأییدشده لازم است.'),
    };
  });
}

/** Specialized (advanced) trading pack is not sellable while decision engine extras stay SOURCE_REQUIRED.
 * API_ACCESS alone is not enough to market an inactive analysis engine as a plan benefit.
 */
export function specializedOfferReady(matrix = buildPlanCapabilityMatrix()) {
  const extras = matrix.filter(row => row.inAdvanced && !row.inProfessional && row.productStatus === 'live');
  const decisionCaps: Capability[] = [
    'ANALYSIS_FULL', 'CONFIDENCE', 'REASON_DETAILS', 'GAP_TREND', 'ANALYSIS_MARKERS', 'ADVANCED_ALERTS',
  ];
  const decisionLive = matrix.some(row => decisionCaps.includes(row.capability) && row.productStatus === 'live');
  return {
    ready: decisionLive && extras.length > 0,
    liveExtras: extras.map(r => r.label),
    blockedReason: decisionLive
      ? null
      : 'پلن تخصصی برای تحلیل معاملاتی هنوز تفاوت اجرایی live ندارد؛ موتور تصمیم غیرفعال را مزیت پلن معرفی نکنید. دسترسی API جدا از سیگنال معامله است.',
  };
}

export function planLevelShortLabel(level: AccessLevel) {
  if (level === 'HOME') return 'خانگی';
  if (level === 'PROFESSIONAL') return 'حرفه‌ای';
  if (level === 'ADVANCED_PROFESSIONAL') return 'تخصصی';
  return 'رایگان';
}
