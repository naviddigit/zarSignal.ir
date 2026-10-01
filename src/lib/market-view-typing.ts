/** Grapheme-safe narrative typing helpers for market-view reports.
 * Display of an existing report only — not live AI generation.
 */

export type NarrativeSection = { id: string; title: string; body: string };

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
    graphemes.push(...segmentGraphemes(section.body));
    ends.push(graphemes.length);
  }
  return { graphemes, ends };
}

/** Characters per second: ~50 baseline, sped up so long reports finish within maxMs. */
export function typingCharsPerSecond(totalGraphemes: number, maxMs = 12_000, baseline = 50) {
  if (totalGraphemes <= 0) return baseline;
  const needed = Math.ceil(totalGraphemes / (maxMs / 1000));
  return Math.max(baseline, Math.min(needed, 160));
}

export function typingIntervalMs(totalGraphemes: number, maxMs = 12_000, baseline = 50) {
  const cps = typingCharsPerSecond(totalGraphemes, maxMs, baseline);
  return Math.max(16, Math.round(1000 / cps));
}

/**
 * Shared progress across sections: earlier sections fully shown before later ones type.
 * Returns the visible body prefix for each section at flat grapheme count `shown`.
 */
export function visibleBodiesAt(sections: NarrativeSection[], shown: number): string[] {
  const { ends } = flattenNarrativeGraphemes(sections);
  let start = 0;
  return sections.map((section, index) => {
    const end = ends[index] ?? start;
    const localFull = end - start;
    const localShown = Math.max(0, Math.min(localFull, shown - start));
    start = end;
    const parts = segmentGraphemes(section.body);
    return parts.slice(0, localShown).join('');
  });
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
