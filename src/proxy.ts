import { NextResponse, type NextRequest } from 'next/server';
import { getMaintenanceSettings } from '@/server/maintenance';
import { escapeMaintenanceHtml, isMaintenanceBypass } from '@/lib/maintenance';
import { getAccountPolicy } from '@/server/account-policy';
import { missingProfileFields } from '@/lib/account-policy';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { ensureAccountSchema } from '@/server/account-schema';

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return '*';
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return origin;
    if (hostname === 'zarsignal.ir' || hostname.endsWith('.zarsignal.ir')) return origin;
    return null;
  } catch { return null; }
}

function applyCors(request: NextRequest, response: NextResponse) {
  const allow = allowedOrigin(request.headers.get('origin'));
  if (allow) {
    response.headers.set('Access-Control-Allow-Origin', allow);
    response.headers.set('Vary', 'Origin');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isMaintenanceBypass(pathname)) return NextResponse.next();
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/public/')) {
    return applyCors(request, new NextResponse(null, { status: 204 }));
  }
  const maintenance = await getMaintenanceSettings();
  if (!maintenance.enabled) {
    const gatedPage = /^\/(account|calculator|analysis|alerts|subscribe)(\/|$)/.test(pathname) && !pathname.startsWith('/account/complete');
    const gatedApi = pathname.startsWith('/api/public/');
    const hasSessionCookie = request.cookies.getAll().some(cookie => /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?$/.test(cookie.name));
    if ((gatedPage || gatedApi) && hasSessionCookie) {
      const session = await auth().catch(() => null);
      if (session?.user?.id) {
        const policy = await getAccountPolicy();
        if (policy.profileRequired) {
          await ensureAccountSchema();
          const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true, name: true, firstName: true, lastName: true, phone: true, city: true, occupation: true } });
          if (user && user.role !== 'ADMIN' && missingProfileFields(user, policy).length) {
            if (gatedApi) return NextResponse.json({ code: 'profile_required', error: 'ابتدا پروفایل خود را تکمیل کنید.' }, { status: 403 });
            const url = new URL('/account/complete', request.url);
            url.searchParams.set('next', pathname + request.nextUrl.search);
            return NextResponse.redirect(url);
          }
        }
      }
    }
    const response = NextResponse.next();
    return pathname.startsWith('/api/public/') ? applyCors(request, response) : response;
  }
  const message = escapeMaintenanceHtml(maintenance.message);
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>زرسیگنال | دیده‌بان تخصصی بازار طلا و ارز</title><meta name="description" content="${message}"><link rel="canonical" href="${escapeMaintenanceHtml(request.nextUrl.origin)}/"><link rel="icon" href="/icon.svg"><style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:#0b0f17;color:#f5f1e7;font-family:Vazirmatn,Tahoma,sans-serif;text-align:center}main{max-width:680px;padding:32px 24px}img{width:72px;height:72px}h1{font-size:clamp(27px,6vw,44px);margin:24px 0 14px}p{color:#c7c9ce;line-height:2;white-space:pre-line;font-size:clamp(16px,3vw,19px)}strong{color:#e7c479}.brand{font-size:20px;font-weight:800;color:#e7c479}</style></head><body><main><img src="/icon.svg" width="72" height="72" alt="لوگوی زرسیگنال"><div class="brand">زرسیگنال</div><h1>در حال تعمیر و به‌روزرسانی هستیم</h1><p>${message}</p><strong>از شکیبایی شما سپاسگزاریم.</strong></main></body></html>`;
  const home = pathname === '/' && request.method === 'GET';
  return new NextResponse(html, { status: home ? 200 : 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...(home ? {} : { 'Retry-After': '3600' }) } });
}

export const config = { matcher: '/((?!_next/static|_next/image|.*\\.(?:css|js|woff2?|png|jpg|jpeg|webp|svg|ico)$).*)' };
