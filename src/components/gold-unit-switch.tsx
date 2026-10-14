'use client';
import type { GoldDisplayUnit } from '@/lib/gold-display-unit';

export function GoldUnitSwitch({ value, onChange }: { value: GoldDisplayUnit; onChange: (value: GoldDisplayUnit) => void }) {
  return <div className="calc-mode gold-unit-switch" role="group" aria-label="واحد طلای ۱۸ عیار" title="۱ مثقال معادل بازار = ۴٫۳۳۱۸ گرم طلای ۱۸ عیار">
    <button type="button" className={value === 'gram' ? 'is-on' : ''} aria-pressed={value === 'gram'} onClick={() => onChange('gram')}>گرم ۱۸</button>
    <button type="button" className={value === 'mesghal' ? 'is-on' : ''} aria-pressed={value === 'mesghal'} onClick={() => onChange('mesghal')}>مثقال</button>
    <small>۴٫۳۳۱۸</small>
  </div>;
}
