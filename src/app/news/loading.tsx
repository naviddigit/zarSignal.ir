export default function NewsLoading() {
  return (
    <main id="main" className="shell content-page news-page news-skel" aria-busy="true" aria-label="در حال بارگذاری مقالات">
      <header className="news-hero news-skel__hero" aria-hidden="true">
        <span className="skeleton news-skel__eyebrow" />
        <span className="skeleton news-skel__title" />
        <span className="skeleton news-skel__lead" />
      </header>
      <ul className="news-list news-skel__list" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="news-skel__card">
            <span className="skeleton news-skel__time" />
            <span className="skeleton news-skel__card-title" />
            <span className="skeleton news-skel__card-copy" />
            <span className="skeleton news-skel__card-copy is-short" />
            <div className="news-skel__tags">
              <span className="skeleton" />
              <span className="skeleton" />
            </div>
          </li>
        ))}
      </ul>
      <span className="route-skel-caption">در حال آماده‌سازی مقالات…</span>
    </main>
  );
}
