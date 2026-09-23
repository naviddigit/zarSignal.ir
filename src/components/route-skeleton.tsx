export function RouteSkeleton({ variant = 'page' }: { variant?: 'page' | 'home' | 'market' | 'admin' | 'auth' }) {
  if (variant === 'home') {
    return (
      <main className="shell home-page route-loading-home" aria-busy="true" aria-label="در حال بارگذاری صفحه اصلی">
        <div className="topline"><span className="skeleton" style={{ width: 180, height: 12, display: 'inline-block' }} /><span className="skeleton" style={{ width: 140, height: 12, display: 'inline-block' }} /></div>
        <section className="hero hero-skeleton">
          <div>
            <div className="skeleton" style={{ width: 120, height: 14 }} />
            <div className="skeleton skeleton-title" style={{ marginTop: 18 }} />
            <div className="skeleton skeleton-copy" />
            <div className="skeleton skeleton-copy" style={{ width: '55%', marginTop: 10 }} />
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <div className="skeleton" style={{ width: 150, height: 44, borderRadius: 10 }} />
              <div className="skeleton" style={{ width: 120, height: 44, borderRadius: 10 }} />
            </div>
          </div>
          <div className="skeleton" style={{ minHeight: 320, borderRadius: 18 }} />
        </section>
        <div className="panel" style={{ padding: 22, marginTop: 8 }}>
          <div className="skeleton" style={{ width: 200, height: 22, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 56, borderRadius: 10 }} />
        </div>
        <span>در حال آماده‌سازی زرسیگنال…</span>
      </main>
    );
  }

  if (variant === 'market') {
    return (
      <main className="shell markets-page route-loading-market" aria-busy="true" aria-label="در حال بارگذاری نبض بازار">
        <div className="skeleton" style={{ width: 100, height: 12 }} />
        <div className="skeleton skeleton-title" style={{ marginTop: 12 }} />
        <div className="skeleton skeleton-copy" />
        <div className="panel" style={{ padding: 20, marginTop: 28 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <div className="skeleton" style={{ width: 64, height: 36, borderRadius: 8 }} />
            <div className="skeleton" style={{ width: 64, height: 36, borderRadius: 8 }} />
            <div className="skeleton" style={{ width: 64, height: 36, borderRadius: 8 }} />
          </div>
          {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8, borderRadius: 12 }} />)}
        </div>
        <span>در حال آماده‌سازی تخته قیمت‌ها…</span>
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
      <span>در حال آماده‌سازی زرسیگنال…</span>
    </main>
  );
}
