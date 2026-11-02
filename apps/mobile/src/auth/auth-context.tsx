import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apolloClient, onSessionExpired } from '../api/client';
import { LOGOUT, PROFILE, type Profile } from '../api/documents';
import { type LoginToken, toStoredToken, tokenStore } from './token-store';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  profile: Profile | null;
  onboarded: boolean;
  signIn: (token: LoginToken) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  markOnboarded: () => Promise<void>;
};

const ONBOARDED_KEY = 'eatme.onboarded';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onboarded, setOnboarded] = useState(false);

  const resetToSignedOut = useCallback(async () => {
    setProfile(null);
    setStatus('signedOut');
    await apolloClient.clearStore();
  }, []);

  // 토큰이 있다는 전제에서 프로필을 불러온다. 세션 만료(갱신 실패)면 갱신 링크가 토큰을 지운다.
  const loadProfile = useCallback(async () => {
    try {
      const { data } = await apolloClient.query({ query: PROFILE, fetchPolicy: 'network-only' });
      setProfile(data?.profile ?? null);
      setStatus('signedIn');
    } catch {
      if (await tokenStore.get()) {
        // 일시 장애: 로그인 상태는 유지하고 프로필만 비워 둔다.
        setProfile(null);
        setStatus('signedIn');
      } else {
        await resetToSignedOut();
      }
    }
  }, [resetToSignedOut]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [token, onboardedFlag] = await Promise.all([
        tokenStore.get(),
        SecureStore.getItemAsync(ONBOARDED_KEY),
      ]);
      if (!active) return;
      setOnboarded(onboardedFlag === '1');
      if (token) {
        await loadProfile();
      } else {
        setStatus('signedOut');
      }
    })();
    return () => {
      active = false;
    };
  }, [loadProfile]);

  useEffect(() => onSessionExpired(() => void resetToSignedOut()), [resetToSignedOut]);

  const signIn = useCallback(
    async (token: LoginToken) => {
      await tokenStore.set(toStoredToken(token));
      await loadProfile();
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    const token = await tokenStore.get();
    if (token) {
      try {
        await apolloClient.mutate({
          mutation: LOGOUT,
          variables: { refreshToken: token.refreshToken },
        });
      } catch {
        // best-effort: 서버 세션 삭제에 실패해도 기기에서는 로그아웃한다.
      }
    }
    await tokenStore.clear();
    await resetToSignedOut();
  }, [resetToSignedOut]);

  const markOnboarded = useCallback(async () => {
    await SecureStore.setItemAsync(ONBOARDED_KEY, '1');
    setOnboarded(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      profile,
      onboarded,
      signIn,
      signOut,
      refreshProfile: loadProfile,
      markOnboarded,
    }),
    [status, profile, onboarded, signIn, signOut, loadProfile, markOnboarded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  return value;
}
