import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminRequestAuthorized } from '@/lib/adminAuth';

export function proxy(request: NextRequest) {
  if (isAdminRequestAuthorized(request)) {
    return NextResponse.next();
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
