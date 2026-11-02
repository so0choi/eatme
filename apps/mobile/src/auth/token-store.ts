import * as SecureStore from 'expo-secure-store';

// expiresAt은 access token 만료 시각(ms epoch). 저장 시 Date.now() + expiresIn * 1000.
export type StoredToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type LoginToken = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
};

const TOKEN_KEY = 'eatme.token';

export function toStoredToken(token: LoginToken, now: number = Date.now()): StoredToken {
  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: now + token.expiresIn * 1000,
  };
}

function parse(raw: string | null): StoredToken | null {
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

// 매 요청마다 SecureStore를 읽지 않도록 메모리 캐시를 둔다(undefined = 아직 읽지 않음).
let cached: StoredToken | null | undefined;

export const tokenStore = {
  async get(): Promise<StoredToken | null> {
    if (cached === undefined) {
      cached = parse(await SecureStore.getItemAsync(TOKEN_KEY));
    }
    return cached;
  },
  async set(token: StoredToken): Promise<void> {
    cached = token;
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(token));
  },
  async clear(): Promise<void> {
    cached = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
