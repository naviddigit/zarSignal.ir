'use client';
export default function ErrorPage() {
  return (
    <main id="main" className="shell error-state">
      <h1>بارگذاری کامل نشد</h1>
      <p>برای دریافت دوبارهٔ صفحه و فایل‌های سایت، بارگذاری مجدد را بزنید.</p>
      {/* A boundary reset cannot recover a failed JavaScript chunk. */}
      <button className="button" onClick={() => window.location.reload()}>بارگذاری مجدد</button>
    </main>
  );
}
