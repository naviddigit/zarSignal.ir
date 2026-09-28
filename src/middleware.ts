import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return '*';
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return origin;
    if (hostname === 'zarsignal.ir' || hostname.endsWith('.zarsignal.ir')) return origin;
    return null;
  } catch {
    return null;
  }
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

export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return applyCors(request, new NextResponse(null, { status: 204 }));
  }
  return applyCors(request, NextResponse.next());
}

export const config = {
  matcher: ['/api/public/:path*'],
};
