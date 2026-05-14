import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminRequestAuthorized } from '@/lib/adminAuth';

export async function proxy(request: NextRequest) {
  if (await isAdminRequestAuthorized(request)) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  return new NextResponse('Auth Required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
