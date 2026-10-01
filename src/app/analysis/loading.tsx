export default function AnalysisLoading() {
  return (
    <main id="main" className="shell content-page analysis-page market-view-page" aria-busy="true" aria-label="در حال آماده‌سازی دید بازار">
      <div className="market-view" aria-hidden="true">
        <span className="skeleton" style={{ width: 120, height: 12 }} />
        <span className="skeleton" style={{ width: '70%', height: 28 }} />
        <span className="skeleton" style={{ width: '100%', height: 48 }} />
        <span className="skeleton" style={{ width: '100%', height: 120, borderRadius: 14 }} />
        <span className="skeleton" style={{ width: '100%', height: 160, borderRadius: 14 }} />
      </div>
      <span className="route-skel-caption">در حال آماده‌سازی دید بازار…</span>
    </main>
  );
}
