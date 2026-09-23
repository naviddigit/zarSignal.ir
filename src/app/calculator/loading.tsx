export default function Loading() {
  return (
    <main className="shell professional-page" aria-busy="true" aria-label="در حال آماده‌سازی ماشین‌حساب">
      <div className="skeleton" style={{ width: 160, height: 12 }} />
      <div className="skeleton" style={{ width: 'min(420px,80%)', height: 36, marginTop: 14 }} />
      <div className="skeleton" style={{ width: 'min(520px,90%)', height: 16, marginTop: 12 }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 28, maxWidth: 520 }}>
        {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ flex: 1, height: 44, borderRadius: 10 }} />)}
      </div>
      <div className="panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: 24, marginTop: 20 }}>
        <div>
          <div className="skeleton" style={{ height: 44, borderRadius: 10, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 72, borderRadius: 10, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 48, borderRadius: 10 }} />
        </div>
        <div className="skeleton" style={{ minHeight: 280, borderRadius: 16 }} />
      </div>
      <span style={{ display: 'block', textAlign: 'center', color: 'var(--text-muted)', marginTop: 18, fontSize: 12 }}>در حال آماده‌سازی ابزارها و قیمت‌های بازار…</span>
    </main>
  );
}
