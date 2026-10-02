import { auth } from '@/auth';
import { db } from '@/lib/db';
import { hasCapability } from '@/lib/capabilities';
import { resolveAccountEntitlement } from '@/server/account-entitlement';
import {
  MARKET_ALERT_CHANNELS,
  MARKET_ALERT_CONDITION_TYPES,
  MARKET_ALERT_DIRECTIONS,
  channelDeliveryReady,
  type MarketAlertChannel,
  type MarketAlertConditionType,
  type MarketAlertDirection,
} from '@/lib/market-change-alerts';

async function requireAlertUser() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return { error: Response.json({ error: 'unauthorized' }, { status: 401 }) };
  const entitlement = await resolveAccountEntitlement(session.user.id).catch(() => null);
  if (!entitlement || !hasCapability(entitlement.level, 'BASIC_ALERTS')) {
    return {
      error: Response.json(
        { error: 'forbidden', message: 'هشدار تغییر بازار برای پلن فعلی شما فعال نیست.' },
        { status: 403 },
      ),
    };
  }
  if (entitlement.statusLabel === 'در انتظار پرداخت') {
    return {
      error: Response.json(
        { error: 'forbidden', message: 'اشتراک در انتظار پرداخت است.' },
        { status: 403 },
      ),
    };
  }
  return { userId: session.user.id, entitlement };
}

export async function GET() {
  const gate = await requireAlertUser();
  if ('error' in gate && gate.error) return gate.error;
  const userId = gate.userId!;
  const [alerts, notifications] = await Promise.all([
    db.marketChangeAlert.findMany({
      where: { userId, status: { in: ['ACTIVE', 'EXPIRED'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);
  return Response.json(
    {
      alerts: alerts.map(a => ({
        id: a.id,
        conditionType: a.conditionType,
        symbol: a.symbol,
        unit: a.unit,
        direction: a.direction,
        threshold: Number(a.threshold),
        channel: a.channel,
        status: a.status,
        armed: a.armed,
        expiresAt: a.expiresAt?.toISOString() ?? null,
        lastFiredAt: a.lastFiredAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
      notifications: notifications.map(n => ({
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.href,
        kind: n.kind,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      channels: MARKET_ALERT_CHANNELS.map(ch => ({ channel: ch, ...channelDeliveryReady(ch) })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const gate = await requireAlertUser();
  if ('error' in gate && gate.error) return gate.error;
  const userId = gate.userId!;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (body.action === 'cancel' && typeof body.id === 'string') {
    await db.marketChangeAlert.updateMany({
      where: { id: body.id, userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (body.action === 'mark_read' && typeof body.id === 'string') {
    await db.inAppNotification.updateMany({
      where: { id: body.id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const conditionType = body.conditionType as MarketAlertConditionType;
  const direction = body.direction as MarketAlertDirection;
  const channel = (body.channel as MarketAlertChannel) || 'IN_APP';
  const symbol = String(body.symbol ?? '').trim();
  const threshold = Number(body.threshold);
  const unit = body.unit == null || body.unit === '' ? null : String(body.unit);
  const expiresHours = body.expiresHours == null ? 72 : Number(body.expiresHours);

  if (!MARKET_ALERT_CONDITION_TYPES.includes(conditionType)) {
    return Response.json({ error: 'invalid_condition' }, { status: 400 });
  }
  if (!MARKET_ALERT_DIRECTIONS.includes(direction)) {
    return Response.json({ error: 'invalid_direction' }, { status: 400 });
  }
  if (!MARKET_ALERT_CHANNELS.includes(channel)) {
    return Response.json({ error: 'invalid_channel' }, { status: 400 });
  }
  if (!symbol || symbol.length > 40) {
    return Response.json({ error: 'invalid_symbol' }, { status: 400 });
  }
  if (!Number.isFinite(threshold)) {
    return Response.json({ error: 'invalid_threshold' }, { status: 400 });
  }
  const delivery = channelDeliveryReady(channel);
  if (!delivery.ready) {
    return Response.json(
      { error: 'channel_unavailable', message: delivery.note, status: delivery.status },
      { status: 400 },
    );
  }

  const expiresAt = Number.isFinite(expiresHours) && expiresHours > 0
    ? new Date(Date.now() + expiresHours * 3600_000)
    : null;

  const alert = await db.marketChangeAlert.create({
    data: {
      userId,
      conditionType,
      symbol,
      unit,
      direction,
      threshold,
      channel: 'IN_APP',
      status: 'ACTIVE',
      armed: true,
      expiresAt,
    },
  });

  return Response.json(
    { id: alert.id, channel: alert.channel, status: alert.status },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  );
}
