'use client';

import { useEffect, useRef } from 'react';
import { track, type GrowthEvent } from '@/lib/analytics';

/** Fire one funnel event once per mount — no PII. */
export function FunnelTrack({
  event,
  props,
}: {
  event: GrowthEvent;
  props?: Record<string, string | number | boolean | null>;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, props);
  }, [event, props]);
  return null;
}
