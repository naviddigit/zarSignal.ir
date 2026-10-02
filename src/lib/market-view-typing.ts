/** Grapheme-safe narrative typing helpers for market-view reports.
 * Display of an existing report only — not live AI generation.
 */

export type MetricTone =
  | 'up'
  | 'down'
  | 'below'
  | 'above'
  | 'pending'
  | 'missing'
  | 'neutral';

export type NarrativeAtom =
  | { kind: 'text'; text: string }
  | { kind: 'metric'; text: string; tone: MetricTone; arrow?: 'up' | 'down' | null };

export type NarrativeSection = {
  id: string;
  title: string;
  /** Plain text (joined atoms) for a11y and prefix checks. */
  body: string;
  atoms?: NarrativeAtom[];
};

export function atomsPlain(atoms: NarrativeAtom[]): string {
  return atoms.map(atom => atom.text).join('');
}

export function sectionAtoms(section: NarrativeSection): NarrativeAtom[] {
  if (section.atoms?.length) return section.atoms;
  return [{ kind: 'text', text: section.body }];
}

export function withAtoms(id: string, title: string, atoms: NarrativeAtom[]): NarrativeSection {
  return { id, title, body: atomsPlain(atoms), atoms };
}

export function segmentGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('fa', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), part => part.segment);
  }
  return Array.from(text);
}

export function flattenNarrativeGraphemes(sections: NarrativeSection[]): {
  graphemes: string[];
  /** Exclusive end index in the flat grapheme list for each section body. */
  ends: number[];
} {
  const graphemes: string[] = [];
  const ends: number[] = [];
  for (const section of sections) {
    graphemes.push(...segmentGraphemes(sectionAtoms(section).map(a => a.text).join('')));
    ends.push(graphemes.length);
  }
  return { graphemes, ends };
}

/**
 * Typing speed is the explicit base CPS from admin settings.
 * Length-based hidden acceleration is removed — long reports simply take longer at the configured rate.
 */
export function typingCharsPerSecond(_totalGraphemes?: number, _maxMs?: number, baseline = 45) {
  return baseline > 0 ? baseline : 45;
}

export function typingIntervalMs(totalGraphemes: number, maxMs = 12_000, baseline = 45) {
  const cps = typingCharsPerSecond(totalGraphemes, maxMs, baseline);
  return Math.max(16, Math.round(1000 / cps));
}

/** How many graphemes should be visible after elapsedMs at speed multiplier (1 or 2). */
export function graphemesForElapsed(
  elapsedMs: number,
  totalGraphemes: number,
  speed: number,
  maxMs = 12_000,
  baseline = 45,
) {
  if (totalGraphemes <= 0 || elapsedMs <= 0) return 0;
  const cps = typingCharsPerSecond(totalGraphemes, maxMs, baseline) * Math.max(0.25, speed);
  return Math.min(totalGraphemes, Math.floor((elapsedMs / 1000) * cps));
}

/**
 * Shared progress across sections: earlier sections fully shown before later ones type.
 * Returns the visible body prefix for each section at flat grapheme count `shown`.
 */
export function visibleBodiesAt(sections: NarrativeSection[], shown: number): string[] {
  return visibleAtomsAt(sections, shown).map(atomsPlain);
}

/** Visible structured atoms per section at flat grapheme count `shown`. */
export function visibleAtomsAt(sections: NarrativeSection[], shown: number): NarrativeAtom[][] {
  const { ends } = flattenNarrativeGraphemes(sections);
  let start = 0;
  return sections.map((section, index) => {
    const end = ends[index] ?? start;
    const localFull = end - start;
    const localShown = Math.max(0, Math.min(localFull, shown - start));
    start = end;
    return sliceAtoms(sectionAtoms(section), localShown);
  });
}

export function sliceAtoms(atoms: NarrativeAtom[], graphemeCount: number): NarrativeAtom[] {
  if (graphemeCount <= 0) return [];
  const out: NarrativeAtom[] = [];
  let remaining = graphemeCount;
  for (const atom of atoms) {
    const parts = segmentGraphemes(atom.text);
    if (remaining >= parts.length) {
      out.push(atom);
      remaining -= parts.length;
      continue;
    }
    if (remaining > 0) {
      const text = parts.slice(0, remaining).join('');
      out.push(atom.kind === 'metric'
        ? { kind: 'metric', text, tone: atom.tone, arrow: atom.arrow }
        : { kind: 'text', text });
      remaining = 0;
    }
    break;
  }
  return out;
}

/** True when `visible` is a grapheme-safe prefix of `full`. */
export function isGraphemePrefix(full: string, visible: string): boolean {
  if (visible === '') return true;
  if (visible === full) return true;
  const fullParts = segmentGraphemes(full);
  const visibleParts = segmentGraphemes(visible);
  if (visibleParts.length > fullParts.length) return false;
  return visibleParts.every((part, i) => part === fullParts[i]);
}

/** Active section index while typing (last section that has any visible chars, or 0). */
export function activeSectionIndex(sections: NarrativeSection[], shown: number): number {
  if (shown <= 0) return 0;
  const bodies = visibleBodiesAt(sections, shown);
  for (let i = bodies.length - 1; i >= 0; i -= 1) {
    if (bodies[i]!.length > 0) return i;
  }
  return 0;
}

export const ANALYSIS_TYPE_SPEED_KEY = 'zs-analysis-type-speed';

export type AnalysisTypeSpeed = 1 | 2;

export function readStoredTypeSpeed(): AnalysisTypeSpeed {
  if (typeof window === 'undefined') return 1;
  try {
    return window.localStorage.getItem(ANALYSIS_TYPE_SPEED_KEY) === '2' ? 2 : 1;
  } catch {
    return 1;
  }
}

export function storeTypeSpeed(speed: AnalysisTypeSpeed) {
  try {
    window.localStorage.setItem(ANALYSIS_TYPE_SPEED_KEY, String(speed));
  } catch { /* private mode */ }
}
