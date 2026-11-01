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

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

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
  errors?: unknown[];
};

// API refreshToken mutation을 호출한다(rotation: 기존 refresh token은 1회용).
// apiUrl은 API 베이스 URL(예: http://localhost:4000). 실패 시 null.
export async function refreshTokens(
  apiUrl: string,
  refreshToken: string,
  now: number = Date.now(),
): Promise<RefreshedToken | null> {
  try {
    const res = await fetch(`${apiUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: REFRESH_TOKEN_MUTATION,
        variables: { refreshToken },
      }),
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const json = (await res.json()) as RefreshTokenResponse;
    const token = json.data?.refreshToken;
    if (json.errors?.length || !token) return null;

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: now + token.expiresIn * 1000,
      refreshExpiresIn: token.refreshExpiresIn,
    };
  } catch {
    return null;
  }
}
