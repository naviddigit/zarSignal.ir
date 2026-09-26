'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, Pause, Play } from 'lucide-react';

/** Decorative illustration, never a confidence meter or a trading decision. */
export function HeroOrbit() {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={root} className="hero-orbit" data-moving={visible && !paused}>
    <div className="hero-orbit__drawing" aria-hidden="true">
      <i className="hero-orbit__ring ring-outer" /><i className="hero-orbit__ring ring-middle" /><i className="hero-orbit__ring ring-inner" />
      <div className="hero-orbit__core"><Activity size={38} strokeWidth={1.6} /><strong>یک نگاه روشن‌تر</strong><span>قیمت · ارزش · ریسک</span></div>
      <span className="hero-orbit__asset asset-gold"><b>Au</b><small>طلا</small></span>
      <span className="hero-orbit__asset asset-silver"><b>Ag</b><small>نقره</small></span>
      <span className="hero-orbit__asset asset-dollar"><b>$</b><small>دلار</small></span>
    </div>
    <div className="hero-orbit__caption"><span>نمای مفهومی محصول؛ سیگنال معاملاتی نیست</span><button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? 'ادامه حرکت نمای مفهومی' : 'توقف حرکت نمای مفهومی'} aria-pressed={paused}>{paused ? <Play size={16} /> : <Pause size={16} />}</button></div>
  </div>;
}
