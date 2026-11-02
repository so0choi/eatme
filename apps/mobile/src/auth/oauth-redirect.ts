// 소셜 로그인 후 API가 앱으로 돌려보내는 딥링크(스펙 §2.3)를 해석한다.
//   ${base}auth/callback?code=…               → 로그인 완료(일회용 code 교환 필요)
//   ${base}link?ticket=…&provider=…           → 기존 계정 연동 필요
//   ${base}auth/callback?error=…              → 실패
// base는 서버 MOBILE_REDIRECT_URI(기본 `eatme://`). Expo Go 개발 중에는 `exp://host:port/--/` 형태다.

export type OAuthRedirect =
  | { kind: 'code'; code: string }
  | { kind: 'link'; ticket: string; provider: string }
  | { kind: 'error'; error: string };

export type OAuthRedirectParams = {
  code?: string | string[];
  ticket?: string | string[];
  provider?: string | string[];
  error?: string | string[];
};

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v ? v : undefined;
}

function parseQuery(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [rawKey, ...rest] = pair.split('=');
    const decode = (s: string) => {
      try {
        return decodeURIComponent(s.replace(/\+/g, ' '));
      } catch {
        return s;
      }
    };
    const key = decode(rawKey);
    if (!(key in params)) params[key] = decode(rest.join('='));
  }
  return params;
}

/** 딥링크 경로(scheme·host 정규화). `eatme://auth/callback` → `auth/callback`. */
function routePath(url: string): string {
  const withoutQuery = url.split(/[?#]/)[0];
  const afterScheme = withoutQuery.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const expoGoIndex = afterScheme.indexOf('/--/');
  const path = expoGoIndex >= 0 ? afterScheme.slice(expoGoIndex + 4) : afterScheme;
  return path.replace(/^\/+|\/+$/g, '');
}

/** 라우트 파라미터(콜백 화면) → 결과. code/ticket/error가 모두 없으면 null. */
export function resolveOAuthParams(params: OAuthRedirectParams): OAuthRedirect | null {
  const error = first(params.error);
  if (error) return { kind: 'error', error };
  const ticket = first(params.ticket);
  if (ticket) return { kind: 'link', ticket, provider: first(params.provider) ?? '' };
  const code = first(params.code);
  if (code) return { kind: 'code', code };
  return null;
}

/** openAuthSessionAsync가 돌려준 URL → 결과. 앱 딥링크가 아니면 null. */
export function parseOAuthRedirect(url: string): OAuthRedirect | null {
  const path = routePath(url);
  if (path !== 'auth/callback' && path !== 'link') return null;
  const queryStart = url.indexOf('?');
  const query = queryStart >= 0 ? url.slice(queryStart + 1).split('#')[0] : '';
  const params = parseQuery(query);
  if (path === 'link') {
    return params.ticket
      ? { kind: 'link', ticket: params.ticket, provider: params.provider ?? '' }
      : { kind: 'error', error: 'oauth' };
  }
  return resolveOAuthParams({ code: params.code, error: params.error }) ?? { kind: 'error', error: 'oauth' };
}

/** 오류 코드 → 사용자 안내. 사용자가 취소한 경우(access_denied)는 조용히 넘어가도록 null. */
export function oauthErrorMessage(error: string): string | null {
  switch (error) {
    case 'access_denied':
      return null;
    case 'account_exists':
      return '이미 다른 방식으로 가입된 이메일이에요. 기존 방식으로 로그인해 주세요.';
    default:
      return '소셜 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.';
  }
}
