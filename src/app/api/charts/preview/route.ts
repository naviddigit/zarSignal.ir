import { NextResponse } from 'next/server';
import { createPreviewSession, previewCookie, previewMaxAge, validPreviewCode } from '@/server/chart-preview';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await request.text();
  if (body.length > 2048) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const form = new URLSearchParams(body);
  if (form.get('action') === 'logout') {
    const response = NextResponse.redirect(new URL('/charts/preview', url), 303);
    response.cookies.set(previewCookie, '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    return response;
  }
  if (!validPreviewCode((form.get('code') ?? '').trim())) return NextResponse.redirect(new URL('/charts/preview?error=invalid', url), 303);
  const session = createPreviewSession();
  if (!session) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const response = NextResponse.redirect(new URL('/markets/gold_melted', url), 303);
  response.headers.set('Cache-Control', 'private, no-store');
  response.cookies.set(previewCookie, session, { maxAge: previewMaxAge, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
  return response;
}
