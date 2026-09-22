export type ChartPoint = { t: string; value: number; o?: number; h?: number; l?: number; c?: number; bubble?: number; bubbleAt?: string };

export function chartPoints(points: ChartPoint[]) {
  return [...new Map(points.filter(p => Number.isFinite(Date.parse(p.t)) && Number.isFinite(p.value))
    .map(p => [Date.parse(p.t), p])).values()].sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
}

export function chartDomain(values: number[]) {
  const min = Math.min(...values), max = Math.max(...values);
  const pad = Math.max((max - min) * .1, Math.abs(max) * .005, .01);
  return { min: min - pad, max: max + pad };
}

export function enoughHistory(points: ChartPoint[]) {
  return points.length >= 3 && Date.parse(points.at(-1)!.t) - Date.parse(points[0].t) >= 5 * 60_000;
}
