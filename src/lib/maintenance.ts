export function isMaintenanceBypass(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
    || pathname.startsWith('/_next/')
    || pathname === '/icon.svg' || pathname === '/favicon.ico' || pathname === '/apple-icon.png'
    || pathname === '/robots.txt' || pathname === '/sitemap.xml'
    || pathname.startsWith('/api/admin/') || pathname.startsWith('/api/auth/')
    || pathname === '/api/health' || pathname === '/api/ready'
    || pathname.startsWith('/api/cron/') || pathname === '/api/payments/webhook';
}

export function escapeMaintenanceHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
