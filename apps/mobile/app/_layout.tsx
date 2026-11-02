import '../global.css';
import { ApolloProvider } from '@apollo/client/react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { apolloClient } from '../src/api/client';
import { AuthProvider, useAuth } from '../src/auth/auth-context';
import { isRouteAllowed, resolveRoute } from '../src/auth/route-guard';

// 스펙 §3.2 라우팅 가드: 인증 상태가 정해지면 허용되지 않은 화면에서 목적지로 교체한다.
function RouteGuard() {
  const { status, profile, onboarded } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    const target = resolveRoute({
      hasToken: status === 'signedIn',
      termsAgreed: profile ? profile.termsAgreedAt != null : null,
      onboarded,
    });
    // target이 null이면 프로필 확인 전(판단 보류)이라 현재 화면을 유지한다.
    if (target && !isRouteAllowed(target, segments)) router.replace(target);
  }, [status, profile, onboarded, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <RouteGuard />
        </AuthProvider>
      </ApolloProvider>
    </GestureHandlerRootView>
  );
}
