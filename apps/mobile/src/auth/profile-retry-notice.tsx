import { useState } from 'react';
import { Button, Notice } from '../ui';
import { useAuth } from './auth-context';

/**
 * 로그인 직후 프로필 조회가 실패하면 라우팅 가드가 판단을 보류해(Task 15) 화면이 그대로 남는다.
 * 그 상태(로그인됨 + 프로필 없음)를 알려 주고 다시 시도할 수 있게 한다.
 */
export function ProfileRetryNotice() {
  const { status, profile, refreshProfile } = useAuth();
  const [retrying, setRetrying] = useState(false);
  if (status !== 'signedIn' || profile) return null;

  const retry = async () => {
    setRetrying(true);
    try {
      await refreshProfile();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Notice message="로그인은 됐지만 계정 정보를 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.">
      <Button label="다시 시도" variant="secondary" loading={retrying} onPress={retry} />
    </Notice>
  );
}
