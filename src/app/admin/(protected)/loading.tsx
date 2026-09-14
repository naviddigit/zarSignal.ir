export default function Loading() {
  return <div className="admin-content-skeleton" aria-busy="true" aria-label="در حال بارگذاری بخش مدیریت">
    <header><div className="skeleton admin-skeleton-kicker"/><div className="skeleton admin-skeleton-title"/><div className="skeleton admin-skeleton-copy"/></header>
    <div className="admin-skeleton-stats">{Array.from({ length: 4 }, (_, index) => <div className="skeleton" key={index}/>)}</div>
    <div className="admin-skeleton-panels"><div className="skeleton"/><div className="skeleton"/></div>
  </div>;
}
