import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { createRefreshLink } from '../auth/refresh-link';
import { type LoginToken, type StoredToken, toStoredToken, tokenStore } from '../auth/token-store';
import { LOGOUT_MUTATION, REFRESH_TOKEN_MUTATION } from './documents';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
const GRAPHQL_URL = `${API_BASE_URL}/graphql`;

type RefreshResponse = {
  data?: { refreshToken?: LoginToken | null } | null;
  errors?: { extensions?: { code?: string } }[];
};

// 갱신 링크 재귀를 피하려고 Apollo를 거치지 않고 fetch로 직접 호출한다.
// refresh token이 거부되면 null, 네트워크/서버 장애면 throw(로그아웃하지 않음).
export async function refreshTokens(refreshToken: string): Promise<StoredToken | null> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: REFRESH_TOKEN_MUTATION, variables: { refreshToken } }),
  });
  if (!res.ok) throw new Error(`refreshToken HTTP ${res.status}`);
  const json = (await res.json()) as RefreshResponse;
  const token = json.data?.refreshToken;
  if (token) return toStoredToken(token);
  if (json.errors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED')) return null;
  throw new Error('refreshToken failed');
}

type LogoutResponse = {
  data?: { logout?: boolean | null } | null;
  errors?: { extensions?: { code?: string } }[];
};

async function requestLogout(token: StoredToken): Promise<'ok' | 'unauthenticated'> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token.accessToken}`,
    },
    body: JSON.stringify({
      query: LOGOUT_MUTATION,
      variables: { refreshToken: token.refreshToken },
    }),
  });
  if (!res.ok) throw new Error(`logout HTTP ${res.status}`);
  const json = (await res.json()) as LogoutResponse;
  if (json.errors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED')) return 'unauthenticated';
  if (json.errors?.length) throw new Error('logout failed');
  return 'ok';
}

// 이 기기 세션을 서버에서 지운다(best-effort, 로컬 토큰 정리는 호출자 몫).
// 보낼 때마다 저장소의 최신 토큰을 읽어 rotation으로 바뀐 refresh token을 쓰고,
// access 만료로 UNAUTHENTICATED면 1회 갱신 후 새 토큰으로 다시 보낸다.
export async function logoutSession(
  getToken: () => Promise<StoredToken | null> = () => tokenStore.get(),
): Promise<void> {
  const token = await getToken();
  if (!token) return;
  if ((await requestLogout(token)) === 'ok') return;
  const refreshed = await refreshTokens(token.refreshToken);
  if (refreshed) await requestLogout(refreshed);
}

// 갱신 실패(세션 만료)를 AuthProvider에 알리기 위한 구독.
type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

const authHeaderLink = new SetContextLink(async (prev) => {
  const token = await tokenStore.get();
  if (!token) return {};
  return { headers: { ...prev.headers, authorization: `Bearer ${token.accessToken}` } };
});

const refreshLink = createRefreshLink({
  getToken: () => tokenStore.get(),
  refresh: refreshTokens,
  onRefreshed: (token) => tokenStore.set(token),
  onLogout: async () => {
    try {
      await tokenStore.clear();
    } finally {
      sessionExpiredListeners.forEach((listener) => listener());
    }
  },
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([refreshLink, authHeaderLink, new HttpLink({ uri: GRAPHQL_URL })]),
  cache: new InMemoryCache(),
});
