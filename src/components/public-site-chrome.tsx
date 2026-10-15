'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Admin owns its navigation; public chrome stays on public routes only. */
export function PublicSiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin' || pathname?.startsWith('/admin/')) return null;
  return children;
}
