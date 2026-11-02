import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../src/auth/auth-context';
import { authErrorMessage } from '../../src/auth/auth-errors';
import { exchangeGoogleCode } from '../../src/auth/google-login';
import { oauthErrorMessage, resolveOAuthParams } from '../../src/auth/oauth-redirect';
import { ProfileRetryNotice } from '../../src/auth/profile-retry-notice';
import { Button, Notice, Screen, ScreenHeader } from '../../src/ui';

// 딥링크 `eatme://auth/callback?code=…|error=…`를 OS가 앱으로 직접 열 때(주로 Android) 처리한다.
// iOS는 보통 auth 세션이 URL을 가로채 로그인 화면이 마무리하지만, 같은 code가 두 경로로 와도
// exchangeGoogleCode가 교환을 한 번으로 묶는다. 로그인이 끝나면 라우팅 가드가 다음 화면으로 보낸다.
export default function AuthCallback() {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ code?: string; error?: string; ticket?: string; provider?: string }>();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const result = resolveOAuthParams(params);
    if (!result) {
      router.replace('/login');
      return;
    }
    switch (result.kind) {
      case 'code':
        exchangeGoogleCode(result.code)
          .then(signIn)
          .catch((e) => setError(authErrorMessage(e, '소셜 로그인에 실패했어요. 다시 시도해 주세요.')));
        return;
      case 'link':
        router.replace({ pathname: '/link', params: { ticket: result.ticket, provider: result.provider } });
        return;
      case 'error': {
        const message = oauthErrorMessage(result.error);
        if (message) setError(message);
        else router.replace('/login');
        return;
      }
    }
  }, [params, router, signIn]);

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="로그인하지 못했어요" />
        <View className="gap-4">
          <Notice message={error} />
          <Button label="로그인으로 돌아가기" onPress={() => router.replace('/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6">
        <ActivityIndicator size="large" color="#16a34a" />
        <ProfileRetryNotice />
      </View>
    </Screen>
  );
}
