export default function PricingLoading() {
  return (
    <main id="main" className="shell content-page membership-page pricing-page pricing-skel" aria-busy="true" aria-label="در حال بارگذاری پلن‌ها">
      <header className="pricing-hero pricing-skel__hero" aria-hidden="true">
        <span className="skeleton pricing-skel__eyebrow" />
        <span className="skeleton pricing-skel__title" />
        <span className="skeleton pricing-skel__lead" />
      </header>
      <section className="pricing-grid pricing-skel__grid" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <article key={i} className="pricing-card pricing-skel__card">
            <span className="skeleton pricing-skel__card-title" />
            <span className="skeleton pricing-skel__card-copy" />
            <span className="skeleton pricing-skel__price" />
            <span className="skeleton pricing-skel__metric" />
            <span className="skeleton pricing-skel__cta" />
            <div className="pricing-skel__features">
              <span className="skeleton" />
              <span className="skeleton" />
              <span className="skeleton" />
            </div>
          </article>
        ))}
      </section>
      <span className="route-skel-caption">در حال آماده‌سازی اشتراک…</span>
    </main>
  );
}
