/** Capability-based entitlements — marketing plan names must not leak into feature checks. */

export const CAPABILITIES = [
  'CURRENT_PRICES',
  'CURRENT_BUBBLE',
  'CALCULATOR_BASIC',
  'CALCULATOR_ADVANCED',
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

/** Logical access levels — commercial names (Plus Pro / Pro Plus) map later. */
export type AccessLevel = 'FREE' | 'HOME' | 'PROFESSIONAL' | 'ADVANCED_PROFESSIONAL';

const LEVEL_CAPS: Record<AccessLevel, readonly Capability[]> = {
  FREE: ['CURRENT_PRICES', 'CURRENT_BUBBLE', 'CALCULATOR_BASIC'],
  HOME: ['CURRENT_PRICES', 'CURRENT_BUBBLE', 'CALCULATOR_BASIC', 'ANALYSIS_BASIC', 'BASIC_ALERTS'],
  PROFESSIONAL: [
    'CURRENT_PRICES', 'CURRENT_BUBBLE', 'CALCULATOR_BASIC', 'CALCULATOR_ADVANCED',
    'ANALYSIS_BASIC', 'ANALYSIS_FULL', 'CONFIDENCE', 'REASON_DETAILS', 'IMPLIED_USD',
    'GAP_TREND', 'ADVANCED_CHART', 'ANALYSIS_MARKERS', 'BASIC_ALERTS', 'ADVANCED_ALERTS',
  ],
  ADVANCED_PROFESSIONAL: [
    'CURRENT_PRICES', 'CURRENT_BUBBLE', 'CALCULATOR_BASIC', 'CALCULATOR_ADVANCED',
    'ANALYSIS_BASIC', 'ANALYSIS_FULL', 'CONFIDENCE', 'REASON_DETAILS', 'IMPLIED_USD',
    'GAP_TREND', 'ADVANCED_CHART', 'ANALYSIS_MARKERS', 'BASIC_ALERTS', 'ADVANCED_ALERTS',
    'FUTURE_GOLD', 'ACCOUNTING',
  ],
};

export function capabilitiesFor(level: AccessLevel): ReadonlySet<Capability> {
  return new Set(LEVEL_CAPS[level]);
}

export function hasCapability(level: AccessLevel, capability: Capability): boolean {
  return LEVEL_CAPS[level].includes(capability);
}

/** Map published plan slug/kind → logical level. Pricing UI names stay separate. */
export function accessLevelFromPlan(input: { slug?: string | null; kind?: string | null } | null | undefined): AccessLevel {
  const key = `${input?.kind ?? ''} ${input?.slug ?? ''}`.toLowerCase();
  if (/api/.test(key)) return 'ADVANCED_PROFESSIONAL';
  if (/pro|professional|plus/.test(key)) return 'PROFESSIONAL';
  if (/home|خانگی/.test(key)) return 'HOME';
  return 'FREE';
}
