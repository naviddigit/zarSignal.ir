'use client';

import { useEffect } from 'react';

const MIN_MS = 2800;
const MAX_MS = 5200;

/**
 * Soft boot: keep logo splash until first paint is stable, then fade site in.
 * Prevents theme/section color flashes on mobile during hydration.
 */
export function SiteBoot() {
  useEffect(() => {
    const root = document.documentElement;
    const started = performance.now();
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_MS - (performance.now() - started));
      window.setTimeout(() => {
        root.classList.add('site-ready');
        root.classList.remove('is-booting');
        window.setTimeout(() => {
          document.getElementById('boot-splash')?.setAttribute('aria-hidden', 'true');
        }, 420);
      }, wait);
    };

    const safety = window.setTimeout(finish, MAX_MS);
    const run = async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
      } catch { /* fonts optional */ }
      requestAnimationFrame(() => requestAnimationFrame(finish));
    };
    void run();
    return () => window.clearTimeout(safety);
  }, []);

  return null;
}
