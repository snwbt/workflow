import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminRequestAuthorized } from '@/lib/adminAuth';

export async function proxy(request: NextRequest) {
  if (await isAdminRequestAuthorized(request)) {
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
