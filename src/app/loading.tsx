import './homepage.css';

/** Homepage skeleton — one composition: topline + hero + board preview, not a noisy dashboard. */
export default function Loading() {
  return <main className="shell homepage" aria-busy="true" aria-label="در حال بارگذاری صفحه اصلی">
    <section className="home-hero" aria-hidden="true">
      <div className="home-hero__copy"><div className="skeleton" style={{ width: 160, height: 16 }} /><div className="skeleton" style={{ width: '90%', height: 110, marginBlock: 24 }} /><div className="skeleton" style={{ width: '85%', height: 48 }} /><div className="skeleton" style={{ width: 180, height: 52, marginTop: 24, borderRadius: 12 }} /></div>
      <div className="hero-orbit"><div className="hero-orbit__drawing"><i className="hero-orbit__ring ring-outer" /><i className="hero-orbit__ring ring-inner" /><div className="hero-orbit__core"><span className="skeleton" style={{ width: 90, height: 24 }} /></div></div></div>
    </section>
    <p role="status" className="home-note">در حال دریافت اطلاعات بازار…</p>
  </main>;
}
