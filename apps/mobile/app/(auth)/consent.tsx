import { useState } from 'react';
import { apolloClient } from '../../src/api/client';
import { AGREE_TERMS } from '../../src/api/documents';
import { useAuth } from '../../src/auth/auth-context';
import { authErrorMessage } from '../../src/auth/auth-errors';
import {
  ConsentChecklist,
  type ConsentState,
  EMPTY_CONSENT,
  isConsentComplete,
} from '../../src/auth/consent-checklist';
import { Button, Notice, Panel, Screen, ScreenHeader } from '../../src/ui';

// 스펙 §2.6: 소셜 가입자는 약관 동의 없이 생성되므로 로그인 직후 이 화면으로 게이트한다.
// 동의 후 프로필을 다시 불러오면 라우팅 가드가 다음 화면(온보딩/탭)으로 보낸다.
export default function Consent() {
  const { refreshProfile, signOut } = useAuth();
  const [consent, setConsent] = useState<ConsentState>(EMPTY_CONSENT);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onAgree = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await apolloClient.mutate({ mutation: AGREE_TERMS });
      await refreshProfile();
    } catch (e) {
      setError(authErrorMessage(e, '동의를 저장하지 못했어요. 다시 시도해 주세요.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="약관 동의"
        title="시작하기 전에 확인해 주세요"
        description="Eat me를 이용하려면 아래 필수 약관에 동의가 필요해요."
      />
      <Panel>
        <ConsentChecklist value={consent} onChange={setConsent} />
        {error ? <Notice message={error} /> : null}
        <Button
          label="동의하고 시작하기"
          loading={submitting}
          disabled={!isConsentComplete(consent)}
          onPress={onAgree}
        />
        <Button label="로그아웃" variant="ghost" disabled={submitting} onPress={() => void signOut()} />
      </Panel>
    </Screen>
  );
}
