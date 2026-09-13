'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main" className="shell error-state"><h1>بارگذاری کامل نشد</h1><p>دوباره تلاش کنید.</p><button className="button" onClick={reset}>تلاش دوباره</button></main>; }
