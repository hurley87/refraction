import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isLocalDevHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')
  );
}

/**
 * Redirect plain-HTTP requests to HTTPS before the client bundle mounts Privy.
 * Privy embedded wallets throw during `PrivyProvider` init on insecure origins
 * (except localhost / 127.0.0.1).
 */
export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  if (isLocalDevHost(hostname)) {
    return NextResponse.next();
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const proto =
    forwardedProto?.split(',')[0].trim() ??
    request.nextUrl.protocol.replace(':', '');
  if (proto !== 'http') {
    return NextResponse.next();
  }

  const httpsUrl = request.nextUrl.clone();
  httpsUrl.protocol = 'https';
  return NextResponse.redirect(httpsUrl, 308);
}

export const config = {
  matcher: [
    /*
     * Skip Next internals and static assets; still run for app routes and API.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
