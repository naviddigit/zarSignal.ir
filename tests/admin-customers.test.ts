import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTehranDateTime, tehranLocalToUtc, tehranParts } from '../src/lib/tehran-datetime';
import { previewCustomerAccessChange } from '../src/server/admin-customers';

test('tehran local round-trips to UTC without inventing wall time', () => {
  const utc = tehranLocalToUtc(1404, 7, 10, 14, 30); // invalid as jalali numbers — function expects Gregorian Tehran parts
  // Use known Gregorian Tehran wall clock: 2026-10-02 15:45 Asia/Tehran
  const known = tehranLocalToUtc(2026, 10, 2, 15, 45);
  const parts = tehranParts(known);
  assert.equal(parts.year, 2026);
  assert.equal(parts.month, 10);
  assert.equal(parts.day, 2);
  assert.equal(parts.hour, 15);
  assert.equal(parts.minute, 45);
  assert.match(formatTehranDateTime(known), /۱۴|15|۲|۱۰/);
  assert.ok(Number.isFinite(utc.getTime()));
});

test('customer access preview flags immediate expiry and gift hours', () => {
  const entitlement = {
    level: 'HOME' as const,
    planLabel: 'خانگی',
    statusLabel: 'فعال' as const,
    expiresAt: new Date(Date.now() + 48 * 3_600_000),
    historyDays: 30,
    owned: [],
    upgrade: { level: null, label: null, items: [] },
  };

  const gift = previewCustomerAccessChange(entitlement, {
    userId: 'u1',
    action: 'gift_hours',
    hours: 24,
    reason: 'پشتیبانی',
  });
  assert.ok(gift.next.expiresAt);
  assert.equal(gift.next.immediateExpire, false);

  const cut = previewCustomerAccessChange(entitlement, {
    userId: 'u1',
    action: 'set_expires_at',
    expiresAtIso: new Date(Date.now() - 60_000).toISOString(),
    reason: 'خاتمه دسترسی',
  });
  assert.equal(cut.next.immediateExpire, true);
  assert.equal(cut.next.statusLabel, 'منقضی');
});
