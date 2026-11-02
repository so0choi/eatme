// bt-token 쿠키에 저장되는 토큰. expiresAt은 access token 만료 시각(ms epoch).
export type StoredToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

// 갱신 결과: 쿠키 maxAge 설정을 위해 refresh 만료(초)를 함께 돌려준다.
export type RefreshedToken = StoredToken & { refreshExpiresIn: number };

// access token 만료 60초 전부터 갱신한다.
export const REFRESH_MARGIN_MS = 60_000;

export function needsRefresh(
  token: { expiresAt: number },
  now: number = Date.now(),
): boolean {
  if (!Number.isFinite(token.expiresAt)) return true;
  return token.expiresAt - now <= REFRESH_MARGIN_MS;
}

export function parseStoredToken(raw: string | undefined): StoredToken | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredToken>;
    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
      expiresIn
      refreshExpiresIn
    }
  }
`;

type RefreshTokenResponse = {
  data?: {
    refreshToken?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      refreshExpiresIn: number;
    } | null;
  } | null;
  errors?: { extensions?: { code?: unknown } }[];
};

// 갱신 결과. unauthenticated는 refresh token 자체가 무효(재로그인 필요),
// transient는 일시적 실패(rate-limit·서버/네트워크 오류 등)라 기존 쿠키를 유지해야 한다.
export type RefreshResult =
  | { ok: true; token: RefreshedToken }
  | { ok: false; reason: 'unauthenticated' | 'transient' };

export type RefreshOptions = {
  now?: number;
  // 브라우저 IP 전달용 x-forwarded-for 값(Next 서버가 대신 호출하므로).
  forwardedFor?: string;
};

// API refreshToken mutation을 호출한다(rotation: 기존 refresh token은 1회용).
// apiUrl은 API 베이스 URL(예: http://localhost:4000).
export async function refreshTokens(
  apiUrl: string,
  refreshToken: string,
  { now = Date.now(), forwardedFor }: RefreshOptions = {},
): Promise<RefreshResult> {
  const transient = { ok: false, reason: 'transient' } as const;
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (forwardedFor) headers['x-forwarded-for'] = forwardedFor;

    const res = await fetch(`${apiUrl}/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: REFRESH_TOKEN_MUTATION,
        variables: { refreshToken },
      }),
      cache: 'no-store',
    });
    if (res.status >= 500) return transient;

    const json = (await res.json().catch(() => null)) as RefreshTokenResponse | null;
    if (!json) return transient;

    if (json.errors?.length) {
      const unauthenticated = json.errors.some(
        (error) => error?.extensions?.code === 'UNAUTHENTICATED',
      );
      return unauthenticated ? { ok: false, reason: 'unauthenticated' } : transient;
    }

    const token = json.data?.refreshToken;
    if (!res.ok || !token) return transient;

    return {
      ok: true,
      token: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: now + token.expiresIn * 1000,
        refreshExpiresIn: token.refreshExpiresIn,
      },
    };
  } catch {
    return transient;
  }
}
