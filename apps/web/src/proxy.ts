import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, TOKEN_COOKIE } from '@/lib/definitions';
import { forwardedFor } from '@/lib/forwarded-for';
import {
  needsRefresh,
  parseStoredToken,
  refreshTokens,
  type RefreshResult,
} from '@/lib/token-refresh';

// 같은 refresh token으로 거의 동시에 들어온 요청(병렬 RSC/prefetch 등)이 rotation 때문에
// 서로를 무효화하지 않도록, 진행 중이거나 방금 끝난 갱신 결과를 잠시 공유한다(단일 인스턴스 기준).
const RECENT_REFRESH_TTL_MS = 10_000;
const inflightRefreshes = new Map<string, Promise<RefreshResult>>();

function refreshOnce(request: NextRequest, refreshToken: string): Promise<RefreshResult> {
  const existing = inflightRefreshes.get(refreshToken);
  if (existing) return existing;

  const promise = refreshTokens(API_BASE_URL, refreshToken, {
    forwardedFor: forwardedFor(request.headers),
  });
  inflightRefreshes.set(refreshToken, promise);
  promise.then((result) => {
    // 일시적 실패는 다음 요청이 바로 재시도하도록 공유하지 않는다.
    if (!result.ok && result.reason === 'transient') {
      inflightRefreshes.delete(refreshToken);
      return;
    }
    setTimeout(() => inflightRefreshes.delete(refreshToken), RECENT_REFRESH_TTL_MS);
  });
  return promise;
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}

// 토큰 갱신은 proxy 한 곳에서만 한다(refresh token rotation으로 병렬 갱신 시 경합 방지).
// 서버 컴포넌트/액션은 쿠키를 읽기만 한다.
export async function proxy(request: NextRequest) {
  const token = parseStoredToken(request.cookies.get(TOKEN_COOKIE)?.value);

  if (!token) {
    return redirectToLogin(request);
  }

  if (!needsRefresh(token)) {
    return NextResponse.next();
  }

  const result = await refreshOnce(request, token.refreshToken);
  if (!result.ok) {
    // refresh token이 무효일 때만 로그아웃한다. 일시적 실패(rate-limit·API 장애 등)에
    // 쿠키를 지우면 대량 로그아웃이 나므로 기존 쿠키로 통과시키고 다음 요청에서 다시 시도한다.
    return result.reason === 'unauthenticated'
      ? redirectToLogin(request)
      : NextResponse.next();
  }
  const refreshed = result.token;

  const value = JSON.stringify({
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: refreshed.expiresAt,
  });

  // 같은 요청의 서버 컴포넌트가 새 토큰을 읽도록 요청 쿠키도 교체한다.
  request.cookies.set(TOKEN_COOKIE, value);
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  response.cookies.set(TOKEN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: refreshed.refreshExpiresIn,
    path: '/',
  });
  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/fridge/:path*',
    '/recipes/:path*',
    '/insights/:path*',
    '/consent',
  ],
};
