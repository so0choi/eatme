import * as AppleAuthentication from 'expo-apple-authentication';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { isAppleLoginAvailable, startAppleLogin } from '../../src/auth/apple-login';
import { useAuth } from '../../src/auth/auth-context';
import { authErrorMessage } from '../../src/auth/auth-errors';
import { loginWithEmail } from '../../src/auth/email-login';
import { exchangeGoogleCode, startGoogleLogin } from '../../src/auth/google-login';
import { oauthErrorMessage } from '../../src/auth/oauth-redirect';
import { ProfileRetryNotice } from '../../src/auth/profile-retry-notice';
import { Button, Notice, Panel, Screen, ScreenHeader, TextField } from '../../src/ui';

type Busy = 'email' | 'google' | 'apple' | null;

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    isAppleLoginAvailable().then((available) => {
      if (active) setAppleAvailable(available);
    });
    return () => {
      active = false;
    };
  }, []);

  const run = async (kind: Exclude<Busy, null>, task: () => Promise<void>, fallback: string) => {
    setBusy(kind);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(authErrorMessage(e, fallback));
    } finally {
      setBusy(null);
    }
  };

  const goToLink = (ticket: string, provider: string) =>
    router.push({ pathname: '/link', params: { ticket, provider } });

  const onEmailLogin = () => {
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    void run('email', async () => signIn(await loginWithEmail(email.trim(), password)), '로그인에 실패했어요.');
  };

  const onGoogleLogin = () =>
    run(
      'google',
      async () => {
        const result = await startGoogleLogin();
        switch (result.kind) {
          case 'code':
            return signIn(await exchangeGoogleCode(result.code));
          case 'link':
            return goToLink(result.ticket, result.provider);
          case 'error': {
            const message = oauthErrorMessage(result.error);
            if (message) setError(message);
            return;
          }
          case 'cancelled':
            return;
        }
      },
      'Google 로그인에 실패했어요.',
    );

  const onAppleLogin = () =>
    run(
      'apple',
      async () => {
        const result = await startAppleLogin();
        if (result.kind === 'token') return signIn(result.token);
        if (result.kind === 'link') return goToLink(result.ticket, result.provider);
      },
      'Apple 로그인에 실패했어요.',
    );

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Eat me"
        title="냉장고를 열기 전에, 로그인부터"
        description="내 재료와 유통기한을 한곳에서 관리해요."
      />
      <Panel>
        <TextField
          label="이메일"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={onEmailLogin}
        />
        {error ? <Notice message={error} /> : null}
        <ProfileRetryNotice />
        <Button label="로그인" loading={busy === 'email'} disabled={busy !== null} onPress={onEmailLogin} />
      </Panel>

      <View className="my-6 items-center">
        <Text className="text-xs text-on-surface-variant">또는</Text>
      </View>

      <View className="gap-3">
        <Button
          label="Google로 계속하기"
          variant="secondary"
          loading={busy === 'google'}
          disabled={busy !== null}
          onPress={onGoogleLogin}
        />
        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={16}
            style={{ width: '100%', height: 48 }}
            onPress={() => {
              if (busy === null) void onAppleLogin();
            }}
          />
        ) : null}
      </View>

      <View className="mt-8 flex-row items-center justify-center gap-1">
        <Text className="text-sm text-on-surface-variant">아직 계정이 없나요?</Text>
        <Link href="/signup" className="text-sm font-semibold text-primary">
          회원가입
        </Link>
      </View>
    </Screen>
  );
}
