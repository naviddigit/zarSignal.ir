/** Capability-based entitlements — marketing plan names must not leak into feature checks. */

export const CAPABILITIES = [
  'CURRENT_PRICES',
  'CURRENT_BUBBLE',
  'CALCULATOR_BASIC',
  'CALCULATOR_ADVANCED',
  'HISTORY_CHART',
  'ANALYSIS_BASIC',
  'ANALYSIS_FULL',
  'CONFIDENCE',
  'REASON_DETAILS',
  'IMPLIED_USD',
  'GAP_TREND',
  'ADVANCED_CHART',
  'ANALYSIS_MARKERS',
  'BASIC_ALERTS',
  'ADVANCED_ALERTS',
  'FUTURE_GOLD',
  'ACCOUNTING',
  'API_ACCESS',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/** Product readiness for public UI — never sell SOURCE_REQUIRED as available. */
export type CapabilityProductStatus = 'live' | 'coming_soon' | 'source_required';

export const CAPABILITY_META: Record<Capability, {
  label: string;
  status: CapabilityProductStatus;
}> = {
  CURRENT_PRICES: { label: 'قیمت زنده بازار', status: 'live' },
  CURRENT_BUBBLE: { label: 'حباب طلا / نقره / دلار', status: 'live' },
  CALCULATOR_BASIC: { label: 'ماشین‌حساب تأییدشده', status: 'live' },
  CALCULATOR_ADVANCED: { label: 'ماشین‌حساب پیشرفته', status: 'coming_soon' },
  HISTORY_CHART: { label: 'تاریخچه نمودار', status: 'live' },
  ANALYSIS_BASIC: { label: 'گزارش دید بازار', status: 'live' },
  ANALYSIS_FULL: { label: 'گزارش کامل V5.4', status: 'source_required' },
  CONFIDENCE: { label: 'شاخص اطمینان', status: 'source_required' },
  REASON_DETAILS: { label: 'دلایل و ریسک', status: 'source_required' },
  IMPLIED_USD: { label: 'دلار ضمنی', status: 'source_required' },
  GAP_TREND: { label: 'روند Gap', status: 'source_required' },
  ADVANCED_CHART: { label: 'نمودار حرفه‌ای', status: 'coming_soon' },
  ANALYSIS_MARKERS: { label: 'نشانگر روی چارت', status: 'source_required' },
  BASIC_ALERTS: { label: 'هشدار قیمت', status: 'coming_soon' },
  ADVANCED_ALERTS: { label: 'هشدار حرفه‌ای', status: 'source_required' },
  FUTURE_GOLD: { label: 'طلای فردایی', status: 'source_required' },
  ACCOUNTING: { label: 'حسابداری معاملات', status: 'source_required' },
  API_ACCESS: { label: 'دسترسی API', status: 'live' },
};

/** Logical access levels — commercial names map via plan slug/title, not UI checks. */
export type AccessLevel = 'FREE' | 'HOME' | 'PROFESSIONAL' | 'ADVANCED_PROFESSIONAL';

const LEVEL_CAPS: Record<AccessLevel, readonly Capability[]> = {
  FREE: ['CURRENT_PRICES', 'CURRENT_BUBBLE', 'CALCULATOR_BASIC', 'HISTORY_CHART'],
  HOME: [
    'CURRENT_PRICES', 'CURRENT_BUBBLE', 'CALCULATOR_BASIC', 'HISTORY_CHART',
    'ANALYSIS_BASIC', 'BASIC_ALERTS',
  ],
  PROFESSIONAL: [
    'CURRENT_PRICES', 'CURRENT_BUBBLE', 'CALCULATOR_BASIC', 'CALCULATOR_ADVANCED', 'HISTORY_CHART',
    'ANALYSIS_BASIC', 'ANALYSIS_FULL', 'CONFIDENCE', 'REASON_DETAILS', 'IMPLIED_USD',
    'GAP_TREND', 'ADVANCED_CHART', 'ANALYSIS_MARKERS', 'BASIC_ALERTS', 'ADVANCED_ALERTS',
  ],
  ADVANCED_PROFESSIONAL: [
    'CURRENT_PRICES', 'CURRENT_BUBBLE', 'CALCULATOR_BASIC', 'CALCULATOR_ADVANCED', 'HISTORY_CHART',
    'ANALYSIS_BASIC', 'ANALYSIS_FULL', 'CONFIDENCE', 'REASON_DETAILS', 'IMPLIED_USD',
    'GAP_TREND', 'ADVANCED_CHART', 'ANALYSIS_MARKERS', 'BASIC_ALERTS', 'ADVANCED_ALERTS',
    'FUTURE_GOLD', 'ACCOUNTING', 'API_ACCESS',
  ],
};

const LEVEL_LABEL: Record<AccessLevel, string> = {
  FREE: 'حساب رایگان',
  HOME: 'پلن خانگی',
  PROFESSIONAL: 'پلن حرفه‌ای',
  ADVANCED_PROFESSIONAL: 'پلن پیشرفته',
};

export function capabilitiesFor(level: AccessLevel): ReadonlySet<Capability> {
  return new Set(LEVEL_CAPS[level]);
}

export function hasCapability(level: AccessLevel, capability: Capability): boolean {
  return LEVEL_CAPS[level].includes(capability);
}

export function accessLevelLabel(level: AccessLevel) {
  return LEVEL_LABEL[level];
}

/** Map published plan → logical level. Pricing UI names stay separate. */
export function accessLevelFromPlan(input: { slug?: string | null; title?: string | null; kind?: string | null } | null | undefined): AccessLevel {
  const key = `${input?.kind ?? ''} ${input?.slug ?? ''} ${input?.title ?? ''}`.toLowerCase();
  if (/api/.test(key)) return 'ADVANCED_PROFESSIONAL';
  if (/pro|professional|plus|حرفه‌/.test(key)) return 'PROFESSIONAL';
  if (/home|خانگی|trader/.test(key)) return 'HOME';
  return 'FREE';
}

export function isInternalProduct(product: string) {
  const value = product.trim();
  if (!value) return true;
  if (value.startsWith('__')) return true;
  return /analysis[_-]?trial/i.test(value);
}

/** Never expose developer slugs / capability codes in public UI. */
export function planDisplayName(product: string, planTitle?: string | null): string {
  if (isInternalProduct(product)) return 'دسترسی آزمایشی';
  if (planTitle?.trim()) return planTitle.trim();
  if (/^[a-z0-9._-]+$/i.test(product)) return 'اشتراک فعال';
  return product;
}

export function nextAccessLevel(level: AccessLevel): AccessLevel | null {
  if (level === 'FREE') return 'HOME';
  if (level === 'HOME') return 'PROFESSIONAL';
  if (level === 'PROFESSIONAL') return 'ADVANCED_PROFESSIONAL';
  return null;
}

/** Public-facing capability rows for dashboard (hides codes). */
export function capabilityRowsFor(level: AccessLevel, historyDays: number) {
  return LEVEL_CAPS[level].map(id => {
    const meta = CAPABILITY_META[id];
    if (id === 'HISTORY_CHART') {
      const depth = historyDays > 0
        ? `تاریخچه تا ${new Intl.NumberFormat('fa-IR').format(historyDays)} روز`
        : 'تاریخچه ۲۴ ساعت';
      return { id, label: depth, status: meta.status, owned: true as const };
    }
    return { id, label: meta.label, status: meta.status, owned: true as const };
  });
}

/** Upsell only live/coming_soon caps the user lacks — never invent SOURCE_REQUIRED as sellable. */
export function upgradePreview(level: AccessLevel) {
  const next = nextAccessLevel(level);
  if (!next) return { level: null as AccessLevel | null, label: null as string | null, items: [] as { label: string; status: CapabilityProductStatus }[] };
  const owned = capabilitiesFor(level);
  const items = LEVEL_CAPS[next]
    .filter(id => !owned.has(id))
    .map(id => CAPABILITY_META[id])
    .filter(meta => meta.status === 'live' || meta.status === 'coming_soon')
    .slice(0, 4)
    .map(meta => ({ label: meta.label, status: meta.status }));
  return { level: next, label: LEVEL_LABEL[next], items };
}
