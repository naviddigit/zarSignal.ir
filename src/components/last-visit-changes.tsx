/** Compact «از آخرین بازدید شما» — real stored baseline only. */

export type LastVisitChangeView = {
  id: string;
  label: string;
  summary: string;
  deltaPercent: number | null;
};

export function LastVisitChanges({
  changes,
  baselineAt,
}: {
  changes: LastVisitChangeView[];
  baselineAt: string | null;
}) {
  if (!changes.length) return null;
  const when = baselineAt
    ? new Intl.DateTimeFormat('fa-IR', {
        timeZone: 'Asia/Tehran',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(baselineAt))
    : null;

  return (
    <aside className="market-view__last-visit" aria-label="از آخرین بازدید شما">
      <h2 className="market-view__last-visit-title">از آخرین بازدید شما</h2>
      {when ? <p className="market-view__meta">نسبت به {when}</p> : null}
      <ul className="market-view__last-visit-list">
        {changes.map(change => (
          <li key={change.id}>
            <strong>{change.label}</strong>
            <span>{change.summary}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
