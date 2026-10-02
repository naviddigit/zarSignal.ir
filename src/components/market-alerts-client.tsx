'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, Trash2 } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/field';

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

const CONDITION_OPTIONS = [
  { value: 'PRICE_CROSS', label: 'عبور قیمت از مقدار' },
  { value: 'GAP_PCT_CROSS', label: 'عبور اختلاف با مرجع از درصد' },
  { value: 'GOLD_SILVER_RELATIVE', label: 'تغییر معتبر نسبت طلا/نقره' },
] as const;

const CONDITION_LABEL = Object.fromEntries(CONDITION_OPTIONS.map(o => [o.value, o.label]));

const DIR_OPTIONS = [
  { value: 'above', label: 'بالاتر از' },
  { value: 'below', label: 'پایین‌تر از' },
  { value: 'either', label: 'عبور از' },
] as const;

const DIR_LABEL = Object.fromEntries(DIR_OPTIONS.map(o => [o.value, o.label]));

const SYMBOL_BY_CONDITION: Record<string, { value: string; label: string }[]> = {
  PRICE_CROSS: [
    { value: 'GOLD_MELTED', label: 'قیمت مظنه آب‌شده' },
    { value: 'USD', label: 'قیمت دلار' },
    { value: 'SILVER_999', label: 'قیمت نقره ۹۹۹' },
  ],
  GAP_PCT_CROSS: [
    { value: 'GOLD_BUBBLE', label: 'اختلاف طلا با مرجع' },
    { value: 'SILVER_BUBBLE', label: 'اختلاف نقره با مرجع' },
    { value: 'USD_BUBBLE', label: 'فاصلهٔ دلار با دلار ضمنی طلا' },
  ],
  GOLD_SILVER_RELATIVE: [
    { value: 'RELATIVE', label: 'نسبت طلا/نقره' },
  ],
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

  const symbolOptions = useMemo(
    () => SYMBOL_BY_CONDITION[form.conditionType] ?? SYMBOL_BY_CONDITION.GAP_PCT_CROSS,
    [form.conditionType],
  );

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

  useEffect(() => {
    if (!symbolOptions.some(o => o.value === form.symbol)) {
      setForm(f => ({ ...f, symbol: symbolOptions[0]?.value ?? f.symbol }));
    }
  }, [form.symbol, symbolOptions]);

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
          unit: form.conditionType === 'PRICE_CROSS' ? (form.unit || null) : null,
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
      <section className="alerts-gate panel">
        <h2>هشدار تغییر بازار</h2>
        <p>این‌ها هشدار تغییر بازار هستند، نه توصیهٔ خرید/فروش. برای فعال‌سازی به پلن دارای هشدار یا دورهٔ آزمایش نیاز دارید.</p>
        <p><Link className="button" href="/pricing">مشاهده پلن‌ها</Link></p>
        <p className="alerts-note" role="note">اعلان داخل سایت مرحلهٔ اول است. Push و SMS فعلاً نیازمند اتصال سرویس‌اند.</p>
      </section>
    );
  }

  return (
    <div className="alerts-page">
      <section className="alerts-card panel">
        <header className="alerts-card__head">
          <Bell size={18} aria-hidden />
          <h2>اعلان‌های داخل سایت</h2>
        </header>
        {notifications.length === 0 ? (
          <p className="alerts-empty">اعلانی ثبت نشده است.</p>
        ) : (
          <ul className="alerts-list">
            {notifications.map(n => (
              <li key={n.id} className={n.readAt ? 'is-read' : 'is-unread'}>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                <div className="alerts-list__meta">
                  <small dir="ltr">{n.createdAt}</small>
                  {!n.readAt ? (
                    <button type="button" className="text-link" onClick={() => void markRead(n.id)}>علامت خوانده‌شده</button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="alerts-card panel">
        <header className="alerts-card__head">
          <h2>شرط جدید</h2>
        </header>
        <p className="alerts-lead">
          شرط، نماد، جهت عبور و اعتبار زمانی را مشخص کنید. ارزیابی پس از دادهٔ معتبر جدید در سرور انجام می‌شود.
        </p>
        <form className="alerts-form" onSubmit={createAlert}>
          <Select
            label="نوع شرط"
            value={form.conditionType}
            options={[...CONDITION_OPTIONS]}
            onChange={value => setForm(f => ({ ...f, conditionType: value }))}
          />
          <Select
            label="نماد / معیار"
            value={form.symbol}
            options={symbolOptions}
            onChange={value => setForm(f => ({ ...f, symbol: value }))}
          />
          <Select
            label="جهت عبور"
            value={form.direction}
            options={[...DIR_OPTIONS]}
            onChange={value => setForm(f => ({ ...f, direction: value }))}
          />
          <Input
            label="آستانه"
            dir="ltr"
            inputMode="decimal"
            value={form.threshold}
            onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
            required
          />
          {form.conditionType === 'PRICE_CROSS' ? (
            <Input
              label="واحد (برای عبور قیمت)"
              dir="ltr"
              value={form.unit}
              placeholder="مثلاً مثقال یا گرم"
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            />
          ) : null}
          <Input
            label="اعتبار زمانی (ساعت)"
            dir="ltr"
            type="number"
            min={1}
            max={720}
            value={form.expiresHours}
            onChange={e => setForm(f => ({ ...f, expiresHours: e.target.value }))}
          />
          <p className="alerts-channel">کانال: اعلان داخل سایت · Push و SMS در این فرم فعال نیستند.</p>
          <button className="button alerts-submit" type="submit" disabled={pending}>
            {pending ? 'در حال ثبت…' : 'ثبت هشدار تغییر بازار'}
          </button>
        </form>
        {error ? <p role="alert" className="alerts-error">{error}</p> : null}
      </section>

      <section className="alerts-card panel">
        <header className="alerts-card__head">
          <h2>هشدارهای فعال</h2>
        </header>
        {alerts.length === 0 ? (
          <p className="alerts-empty">هشدار فعالی ندارید.</p>
        ) : (
          <ul className="alerts-list">
            {alerts.map(a => (
              <li key={a.id} className="alerts-list__item">
                <div className="alerts-list__body">
                  <strong>{CONDITION_LABEL[a.conditionType] ?? a.conditionType}</strong>
                  <p>
                    {a.symbol} · {DIR_LABEL[a.direction] ?? a.direction} {a.threshold}
                    {a.unit ? ` · واحد ${a.unit}` : ''}
                    {' · '}{a.armed ? 'آماده' : 'منتظر بازآماده‌شدن'}
                    {' · '}{a.status}
                  </p>
                </div>
                {a.status === 'ACTIVE' ? (
                  <button type="button" className="alerts-list__cancel" onClick={() => void cancelAlert(a.id)}>
                    <Trash2 size={14} aria-hidden /> لغو
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
