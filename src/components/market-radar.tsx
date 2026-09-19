'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import type { LiveBubbleCard } from '@/lib/bubbles';

type Focus = 'GOLD_BUBBLE' | 'SILVER_BUBBLE' | 'USD_BUBBLE' | 'EUR_LOCK' | 'AED_LOCK' | 'DUBAI_LOCK';

type Node = {
  key: Focus;
  token: string;
  short: string;
  place: string;
  bubbleKey?: LiveBubbleCard['key'];
  locked?: boolean;
};

const nodes: Node[] = [
  { key: 'GOLD_BUBBLE', token: 'Au', short: 'طلا', place: 'place-gold', bubbleKey: 'GOLD_BUBBLE' },
  { key: 'SILVER_BUBBLE', token: 'Ag', short: 'نقره', place: 'place-silver', bubbleKey: 'SILVER_BUBBLE', locked: true },
  { key: 'USD_BUBBLE', token: '$', short: 'دلار', place: 'place-dollar', bubbleKey: 'USD_BUBBLE' },
  { key: 'EUR_LOCK', token: '€', short: 'یورو', place: 'place-euro', locked: true },
  { key: 'AED_LOCK', token: 'د', short: 'درهم', place: 'place-aed', locked: true },
  { key: 'DUBAI_LOCK', token: 'Db', short: 'دبی', place: 'place-dubai', locked: true },
];

const autoFocus: Focus[] = ['GOLD_BUBBLE', 'USD_BUBBLE', 'SILVER_BUBBLE', 'EUR_LOCK', 'AED_LOCK', 'DUBAI_LOCK'];

function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}٪`;
}

export function MarketRadar({ bubbles }: { bubbles: LiveBubbleCard[] }) {
  const [focus, setFocus] = useState<Focus>('GOLD_BUBBLE');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setFocus(current => autoFocus[(autoFocus.indexOf(current) + 1) % autoFocus.length]);
    }, 3600);
    return () => window.clearInterval(id);
  }, [paused]);

  const node = nodes.find(item => item.key === focus)!;
  const card = useMemo(
    () => (node.bubbleKey ? bubbles.find(item => item.key === node.bubbleKey) : undefined),
    [bubbles, node.bubbleKey],
  );
  const ready = !node.locked && card && (card.status === 'ok' || card.status === 'stale') && card.percent != null;
  const locked = Boolean(node.locked || card?.status === 'blocked');
  const tone = ready ? (card!.percent! >= 0 ? 'up' : 'down') : locked ? 'locked' : 'empty';
  const title = locked ? `${node.short} · قفل` : node.bubbleKey === 'USD_BUBBLE' ? 'فاصله دلار' : `حباب ${node.short}`;

  return (
    <div
      className={`radar-art radar-restored tone-${tone}`}
      aria-label="رادار حباب بازار"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="radar-grid" />
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="orbit orbit-three" />
      <div className="radar-ray" />
      <span className="radar-label label-top">BUBBLE RADAR</span>
      <span className="radar-label label-bottom">AUTO FOCUS</span>

      <div className="radar-center radar-center-live" key={focus} aria-live="polite">
        <span className="radar-live-label">{title}</span>
        <strong className={`radar-live-value is-${tone}`}>
          {ready ? formatPercent(card!.percent!) : locked ? <><Lock size={18} aria-hidden /> قفل</> : '—'}
        </strong>
        <small>
          {ready
            ? (card!.status === 'stale' ? 'داده کمی قدیمی · سیگنال معامله نیست' : 'محاسبه زنده · سیگنال معامله نیست')
            : locked
              ? 'با اشتراک پریمیوم باز می‌شود'
              : card?.reason ?? 'در انتظار داده'}
        </small>
      </div>

      {nodes.map(item => {
        const itemCard = item.bubbleKey ? bubbles.find(bubble => bubble.key === item.bubbleKey) : undefined;
        const itemLocked = Boolean(item.locked || itemCard?.status === 'blocked');
        return (
          <button
            key={item.key}
            type="button"
            className={`radar-token ${item.place} ${focus === item.key ? 'is-active' : ''} ${itemLocked ? 'is-locked' : ''}`}
            aria-pressed={focus === item.key}
            onClick={() => { setFocus(item.key); setPaused(true); }}
          >
            <b>{item.token}</b>
            <small>{item.short}</small>
            {itemLocked && <em className="radar-lock-badge" aria-label="قفل"><Lock size={9} /></em>}
          </button>
        );
      })}

      <div className="radar-caption"><span className="status-dot" /> چرخش خودکار بین نمادها · قفل = پریمیوم</div>
    </div>
  );
}
