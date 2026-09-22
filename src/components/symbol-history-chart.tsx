import Link from 'next/link';
export function SymbolHistoryChart({ symbol, name }: { symbol: string; name: string }) {
  return <section className="panel symbol-history chart-teaser"><div><span className="eyebrow">PRICE HISTORY</span><h2>تاریخچه قیمت {name}</h2><p>نمودار کامل، بازه‌ها و جزئیات هر کندل در صفحه اختصاصی بازار.</p></div><Link className="button" href={`/charts/${symbol.toLowerCase()}`}>مشاهده چارت کامل</Link></section>;
}
