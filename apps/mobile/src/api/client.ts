import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { createRefreshLink } from '../auth/refresh-link';
import { type LoginToken, type StoredToken, toStoredToken, tokenStore } from '../auth/token-store';
import { REFRESH_TOKEN_MUTATION } from './documents';

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
    await tokenStore.clear();
    sessionExpiredListeners.forEach((listener) => listener());
  },
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([refreshLink, authHeaderLink, new HttpLink({ uri: GRAPHQL_URL })]),
  cache: new InMemoryCache(),
});
