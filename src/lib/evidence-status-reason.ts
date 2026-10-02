import type { MarketViewEvidenceId } from '@/lib/market-view-report';

/** Map machine / bubble reasons to specific Persian status reasons for evidence rows. */

export type EvidenceReasonKind =
  | 'price_missing'
  | 'input_stale'
  | 'unit_invalid'
  | 'reference_inactive'
  | 'history_insufficient'
  | 'other';

const SYMBOL_FA: Record<string, string> = {
  GOLD_MELTED: 'مظنه آب‌شده',
  GOLD_18K: 'گرم ۱۸ عیار',
  XAU_USD: 'اونس جهانی طلا',
  XAG_USD: 'اونس جهانی نقره',
  USD: 'دلار',
  AED: 'درهم',
  SILVER_999: 'نقره ۹۹۹',
  SEKE_CASH: 'سکه',
};

export function evidenceReasonKind(raw: string | null | undefined): EvidenceReasonKind {
  if (!raw) return 'other';
  if (/^missing_/i.test(raw) || /داده زنده در دسترس نیست|قیمت بازار نقره|missing_iran|missing_market|missing_gold/i.test(raw)) return 'price_missing';
  if (/قدیمی|stale|input_stale/i.test(raw)) return 'input_stale';
  if (/^invalid_|rial_toman_mismatch|واحد/i.test(raw)) return 'unit_invalid';
  if (/مرجع|reference|blocked|SPEC|فعال نیست|تأیید نشده/i.test(raw)) return 'reference_inactive';
  if (/تاریخچه|history/i.test(raw)) return 'history_insufficient';
  return 'other';
}

function symbolFromMissing(raw: string): string | null {
  const m = raw.match(/^missing_([A-Z0-9_]+)$/i) ?? raw.match(/^invalid_([A-Z0-9_]+)$/i);
  return m?.[1] ? (SYMBOL_FA[m[1].toUpperCase()] ?? m[1]) : null;
}

/** Human status reason for an evidence cell — never collapse everything to «در دسترس نیست». */
export function explainEvidenceStatus(args: {
  id: MarketViewEvidenceId;
  status: 'ok' | 'stale' | 'unavailable' | 'blocked';
  rawReason: string | null | undefined;
  hasMarketPrice: boolean;
}): string | null {
  const { id, status, rawReason, hasMarketPrice } = args;
  if (status === 'ok') return null;

  if (id === 'coin') {
    if (hasMarketPrice) return 'مرجع محاسباتی سکه فعلاً فعال نیست';
    return 'قیمت موجود نیست';
  }

  if (status === 'stale' || evidenceReasonKind(rawReason) === 'input_stale') {
    return 'ورودی قدیمی است';
  }

  const kind = evidenceReasonKind(rawReason);
  if (kind === 'unit_invalid') return 'واحد نامعتبر است';
  if (kind === 'history_insufficient') return 'تاریخچه کافی نیست';
  if (kind === 'reference_inactive') return 'مرجع محاسباتی فعال نیست';

  if (kind === 'price_missing') {
    const named = rawReason ? symbolFromMissing(rawReason) : null;
    if (named) return `قیمت ${named} موجود نیست`;
    return 'قیمت موجود نیست';
  }

  if (status === 'blocked') return 'مرجع محاسباتی فعال نیست';
  if (status === 'unavailable') {
    if (!hasMarketPrice) return 'قیمت موجود نیست';
    return 'مرجع محاسباتی فعال نیست';
  }

  return rawReason && !/^missing_|^invalid_/i.test(rawReason) ? rawReason : 'قیمت موجود نیست';
}

/** Public label for USD gap — not fundamental dollar value or an independent bubble. */
export const USD_GAP_PUBLIC_LABEL = 'فاصلهٔ دلار بازار با دلار ضمنی طلا';
