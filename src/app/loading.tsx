import { RouteSkeleton } from '@/components/route-skeleton';

/** Homepage skeleton — one composition: topline + hero + board preview, not a noisy dashboard. */
export default function Loading() {
  return <RouteSkeleton variant="home" />;
}
