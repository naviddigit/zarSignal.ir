import { NextResponse } from 'next/server';
import { adminSession, sessionValue, validAdminToken } from '@/server/admin-auth';

export async function POST(request: Request) {
  if (new URL(request.url).searchParams.get('_method') === 'delete') return destroy(request);
  const session = sessionValue();
  // ponytail: config() null used to look like "wrong token"; surface config first
  if (!session) return redirectTo('/admin/login?error=config', request);
  const formData = await request.formData();
  if (!validAdminToken(formData.get('token'))) return redirectTo('/admin/login?error=1', request);
  const response = redirectTo('/admin', request);
  response.cookies.set(adminSession.cookieName, session, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: adminSession.maxAge });
  return response;
}

export async function DELETE(request: Request) {
  return destroy(request);
}

function destroy(request: Request) {
  const response = redirectTo('/admin/login', request);
  response.cookies.set(adminSession.cookieName, '', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
  return response;
}

function publicOrigin(request: Request) {
  // Prefer browser-facing host. Behind nginx → localhost:3000, request.url is wrong for cookies.
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    try { return new URL(originHeader).origin; } catch { /* fall through */ }
  }
  const referer = request.headers.get('referer');
  if (referer) {
    try { return new URL(referer).origin; } catch { /* fall through */ }
  }
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (host && !/^localhost(?::\d+)?$/i.test(host) && !/^127\.0\.0\.1(?::\d+)?$/i.test(host)) {
    return `${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`;
  }
  const configured = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try { return new URL(configured).origin; } catch { /* fall through */ }
  }
  return new URL(request.url).origin;
}

function redirectTo(path: string, request: Request) {
  return NextResponse.redirect(new URL(path, publicOrigin(request)), 303);
}
