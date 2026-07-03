import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/definitions';

export function proxy(request: NextRequest) {
  const session = request.cookies.get(TOKEN_COOKIE);

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/app/:path*'], // 보호할 경로
};
