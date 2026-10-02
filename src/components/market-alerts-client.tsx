'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Trash2 } from 'lucide-react';

type AlertRow = {
  id: string;
  conditionType: string;
  symbol: string;
  unit: string | null;
  direction: string;
  threshold: number;
  channel: string;
  status: string;
  armed: boolean;
  expiresAt: string | null;
  lastFiredAt: string | null;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const CONDITION_LABEL: Record<string, string> = {
  PRICE_CROSS: 'عبور قیمت از مقدار',
  GAP_PCT_CROSS: 'عبور اختلاف با مرجع از درصد',
  GOLD_SILVER_RELATIVE: 'تغییر معتبر نسبت طلا/نقره',
};

const DIR_LABEL: Record<string, string> = {
  above: 'بالاتر از',
  below: 'پایین‌تر از',
  either: 'عبور از',
};

export function MarketAlertsClient({ canManage }: { canManage: boolean }) {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    conditionType: 'GAP_PCT_CROSS',
    symbol: 'GOLD_BUBBLE',
    unit: '',
    direction: 'above',
    threshold: '1',
    expiresHours: '72',
  });

  const load = useCallback(async () => {
    if (!canManage) return;
    const res = await fetch('/api/public/alerts', { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { message?: string } | null;
      setError(data?.message ?? 'بارگذاری هشدارها ممکن نشد.');
      return;
    }
    const data = await res.json() as { alerts: AlertRow[]; notifications: NotificationRow[] };
    setAlerts(data.alerts);
    setNotifications(data.notifications);
    setError(null);
  }, [canManage]);

  useEffect(() => { void load(); }, [load]);

  async function createAlert(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/public/alerts', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditionType: form.conditionType,
          symbol: form.symbol,
          unit: form.unit || null,
          direction: form.direction,
          threshold: Number(form.threshold),
          expiresHours: Number(form.expiresHours),
          channel: 'IN_APP',
        }),
      });
      const data = await res.json().catch(() => null) as { message?: string; error?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? data?.error ?? 'ایجاد نشد');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ایجاد نشد');
    } finally {
      setPending(false);
    }
  }

  async function cancelAlert(id: string) {
    await fetch('/api/public/alerts', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', id }),
    });
    await load();
  }

  async function markRead(id: string) {
    await fetch('/api/public/alerts', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', id }),
    });
    await load();
  }

  if (!canManage) {
    return (
      <section className="admin-card">
        <h2>هشدار تغییر بازار</h2>
        <p>این‌ها هشدار تغییر بازار هستند، نه توصیهٔ خرید/فروش. برای فعال‌سازی به پلن دارای هشدار یا دورهٔ آزمایش نیاز دارید.</p>
        <p><Link className="button" href="/pricing">مشاهده پلن‌ها</Link></p>
        <p role="note">اعلان داخل سایت مرحلهٔ اول است. Push و SMS فعلاً نیازمند اتصال سرویس‌اند و در تست پیام واقعی ارسال نمی‌شود.</p>
      </section>
    );
  }

  return (
    <div className="alerts-page">
      <section className="admin-card">
        <h2><Bell size={18} aria-hidden /> اعلان‌های داخل سایت</h2>
        {notifications.length === 0 ? <p>اعلانی ثبت نشده است.</p> : (
          <ul className="alerts-list">
            {notifications.map(n => (
              <li key={n.id} className={n.readAt ? 'is-read' : 'is-unread'}>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                <small dir="ltr">{n.createdAt}</small>
                {!n.readAt ? (
                  <button type="button" className="text-link" onClick={() => void markRead(n.id)}>علامت خوانده‌شده</button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-card">
        <h2>شرط جدید</h2>
        <p>شرط، نماد، واحد، جهت عبور، اعتبار زمانی و کانال اطلاع‌رسانی را مشخص کنید. ارزیابی پس از دادهٔ معتبر جدید در سرور انجام می‌شود.</p>
        <form className="admin-form-grid" onSubmit={createAlert}>
          <label>
            <span>نوع شرط</span>
            <select value={form.conditionType} onChange={e => setForm(f => ({ ...f, conditionType: e.target.value }))}>
              {Object.entries(CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>
            <span>نماد / معیار</span>
            <select value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}>
              <option value="GOLD_BUBBLE">اختلاف طلا با مرجع</option>
              <option value="SILVER_BUBBLE">اختلاف نقره با مرجع</option>
              <option value="USD_BUBBLE">فاصلهٔ دلار با دلار ضمنی طلا</option>
              <option value="GOLD_MELTED">قیمت مظنه آب‌شده</option>
              <option value="USD">قیمت دلار</option>
              <option value="SILVER_999">قیمت نقره ۹۹۹</option>
              <option value="RELATIVE">نسبت طلا/نقره (برای شرط نسبی)</option>
            </select>
          </label>
          <label>
            <span>جهت عبور</span>
            <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}>
              {Object.entries(DIR_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>
            <span>آستانه</span>
            <input dir="ltr" value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))} required />
          </label>
          <label>
            <span>واحد (برای عبور قیمت)</span>
            <input dir="ltr" value={form.unit} placeholder="مثلاً مثقال یا گرم" onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          </label>
          <label>
            <span>اعتبار زمانی (ساعت)</span>
            <input dir="ltr" type="number" min={1} max={720} value={form.expiresHours} onChange={e => setForm(f => ({ ...f, expiresHours: e.target.value }))} />
          </label>
          <p className="wide">کانال: اعلان داخل سایت (فعال). Push و SMS نیازمند اتصال سرویس‌اند — در این فرم فعال نیستند.</p>
          <button className="button" type="submit" disabled={pending}>{pending ? '…' : 'ثبت هشدار تغییر بازار'}</button>
        </form>
        {error ? <p role="alert">{error}</p> : null}
      </section>

      <section className="admin-card">
        <h2>هشدارهای فعال</h2>
        {alerts.length === 0 ? <p>هشدار فعالی ندارید.</p> : (
          <ul className="alerts-list">
            {alerts.map(a => (
              <li key={a.id}>
                <strong>{CONDITION_LABEL[a.conditionType] ?? a.conditionType}</strong>
                <p>
                  {a.symbol} · {DIR_LABEL[a.direction] ?? a.direction} {a.threshold}
                  {a.unit ? ` · واحد ${a.unit}` : ''}
                  {' · '}{a.armed ? 'آماده' : 'منتظر بازآماده‌شدن'}
                  {' · '}{a.status}
                </p>
                {a.status === 'ACTIVE' ? (
                  <button type="button" className="text-link" onClick={() => void cancelAlert(a.id)}>
                    <Trash2 size={14} aria-hidden /> لغو هشدار
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
