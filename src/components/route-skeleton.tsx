export function RouteSkeleton({ variant = 'page' }: { variant?: 'page' | 'home' | 'market' | 'admin' | 'auth' }) {
  if (variant === 'home') {
    return (
      <main className="shell home-page route-loading-home" aria-busy="true" aria-label="در حال بارگذاری صفحه اصلی">
        <div className="route-skel-topline">
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
        <section className="route-skel-hero">
          <div className="route-skel-copy">
            <div className="skeleton route-skel-kicker" />
            <div className="skeleton route-skel-title" />
            <div className="skeleton route-skel-line" />
            <div className="skeleton route-skel-line is-short" />
            <div className="route-skel-actions">
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          </div>
          <div className="skeleton route-skel-radar" />
        </section>
        <div className="route-skel-board">
          <div className="skeleton route-skel-board-title" />
          <div className="route-skel-cards">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        </div>
        <span className="route-skel-caption">در حال آماده‌سازی زرسیگنال…</span>
      </main>
    );
  }

  if (variant === 'market') {
    return (
      <main className="shell markets-page route-loading-market" aria-busy="true" aria-label="در حال بارگذاری نبض بازار">
        <div className="route-skel-market">
          <div className="skeleton route-skel-kicker" />
          <div className="skeleton route-skel-title" />
          <div className="skeleton route-skel-line" />
          <div className="route-skel-tabs">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
          <div className="route-skel-rows">
            {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" />)}
          </div>
        </div>
        <span className="route-skel-caption">در حال آماده‌سازی تخته قیمت‌ها…</span>
      </main>
    );
  }

  return (
    <main className={`route-loading route-loading-${variant}`} aria-busy="true" aria-label="در حال بارگذاری">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-copy" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <span className="route-skel-caption">در حال آماده‌سازی زرسیگنال…</span>
    </main>
  );
}
