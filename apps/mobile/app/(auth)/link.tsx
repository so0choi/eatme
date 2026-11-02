import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { apolloClient } from '../../src/api/client';
import { LINK_SOCIAL_ACCOUNT } from '../../src/api/documents';
import { useAuth } from '../../src/auth/auth-context';
import { authErrorMessage } from '../../src/auth/auth-errors';
import { ProfileRetryNotice } from '../../src/auth/profile-retry-notice';
import { Button, Notice, Panel, Screen, ScreenHeader, TextField } from '../../src/ui';

const PROVIDER_LABEL: Record<string, string> = { google: 'Google', apple: 'Apple', naver: '네이버' };

// 소셜 로그인 이메일이 이미 비밀번호 계정으로 가입돼 있을 때: 기존 비밀번호로 소유권을 확인하고 연동한다.
// API 딥링크 `eatme://link?ticket=…&provider=…`가 이 화면(/link)으로 바로 열리기도 한다.
export default function LinkAccount() {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ ticket?: string; provider?: string }>();
  const ticket = typeof params.ticket === 'string' ? params.ticket : '';
  const providerLabel = PROVIDER_LABEL[params.provider ?? ''] ?? '소셜';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const backToLogin = () => router.replace('/login');

  if (!ticket) {
    return (
      <Screen>
        <ScreenHeader title="연동 요청을 찾을 수 없어요" description="요청이 만료됐을 수 있어요. 다시 로그인해 주세요." />
        <Button label="로그인으로 돌아가기" onPress={backToLogin} />
      </Screen>
    );
  }

  const onSubmit = async () => {
    if (!password) {
      setError('기존 비밀번호를 입력해 주세요.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await apolloClient.mutate({
        mutation: LINK_SOCIAL_ACCOUNT,
        variables: { ticket, password },
      });
      if (!data) throw new Error('linkSocialAccount 응답이 비어 있습니다.');
      await signIn(data.linkSocialAccount);
    } catch (e) {
      setError(authErrorMessage(e, '계정 연동에 실패했어요. 다시 시도해 주세요.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="계정 연동"
        title={`${providerLabel} 계정을 연결할까요?`}
        description={`이 이메일은 이미 비밀번호로 가입돼 있어요. 기존 비밀번호를 입력하면 다음부터 ${providerLabel}로도 로그인할 수 있어요.`}
      />
      <Panel>
        <TextField
          label="기존 비밀번호"
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={onSubmit}
        />
        {error ? <Notice message={error} /> : null}
        <ProfileRetryNotice />
        <Button label="연동하고 로그인" loading={submitting} onPress={onSubmit} />
        <Button label="취소" variant="ghost" disabled={submitting} onPress={backToLogin} />
      </Panel>
    </Screen>
  );
}
