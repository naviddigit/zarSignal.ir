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

function redirectTo(path: string, request: Request) {
  // In local development Next may normalize request.url to localhost. Keep the
  // browser's original host so the just-set host-only cookie follows the redirect.
  const origin = request.headers.get('origin') ?? request.headers.get('referer') ?? request.url;
  return NextResponse.redirect(new URL(path, origin), 303);
}
