export default function AccountLoading() {
  return (
    <main id="main" className="shell content-page account-page account-skel" aria-busy="true" aria-label="در حال بارگذاری میز کار">
      <div className="account-dash-hero account-skel__hero">
        <div className="account-dash-hero__who">
          <span className="skeleton account-skel__avatar" />
          <div className="account-skel__who-copy">
            <span className="skeleton account-skel__line is-xs" />
            <span className="skeleton account-skel__line is-title" />
            <span className="skeleton account-skel__line is-meta" />
          </div>
        </div>
        <span className="skeleton account-skel__cta" />
      </div>

      <div className="account-quick__grid account-skel__quick" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="skeleton account-skel__tile" />
        ))}
      </div>

      <section className="account-today account-skel__panel" aria-hidden="true">
        <span className="skeleton account-skel__line is-heading" />
        <div className="account-skel__rows">
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      </section>

      <section className="account-caps account-skel__panel" aria-hidden="true">
        <span className="skeleton account-skel__line is-heading" />
        <div className="account-skel__chips">
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      </section>

      <span className="route-skel-caption">در حال آماده‌سازی میز کار…</span>
    </main>
  );
}
