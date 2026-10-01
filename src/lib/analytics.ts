'use client';

/** Growth analytics foundation — no PII in payloads. Safe no-op if endpoint fails. */

export type GrowthEvent =
  | 'landing_view'
  | 'market_view'
  | 'bubble_view'
  | 'calculator_open'
  | 'calculator_complete'
  | 'analysis_preview_view'
  | 'signup_start'
  | 'signup_complete'
  | 'pricing_view'
  | 'plan_select'
  | 'checkout_start'
  | 'payment_success'
  | 'payment_failed'
  | 'subscription_activated'
  | 'analysis_view'
  | 'alert_created'
  | 'chart_marker_open'
  | 'education_open';

export function track(event: GrowthEvent, props?: Record<string, string | number | boolean | null>) {
  if (typeof window === 'undefined') return;
  const payload = {
    event,
    props: props ?? {},
    path: window.location.pathname,
    ts: new Date().toISOString(),
  };
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/public/events', new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch('/api/public/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
  } catch { /* analytics must never break UX */ }
}
