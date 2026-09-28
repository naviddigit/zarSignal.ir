export default function Loading() {
  return <main className="shell content-page analysis-page" aria-busy="true" aria-label="بارگذاری بررسی بازار">
    <p role="status">در حال دریافت بررسی بازار و وضعیت دسترسی…</p>
    <div className="panel analysis-summary" aria-hidden="true"><div className="analysis-metrics"><h2>بررسی قیمت و حباب</h2><dl><div><dt>قیمت بازار</dt><dd>—</dd></div><div><dt>فاصله با ارزش محاسباتی</dt><dd>—</dd></div></dl></div></div>
    <div className="panel chart-empty" aria-hidden="true">نمودار قیمت و حباب</div>
  </main>;
}
