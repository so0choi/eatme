import { Platform } from 'react-native';
import { apolloClient } from '../api/client';
import { LOGIN, SIGNUP } from '../api/documents';
import type { LoginToken } from './token-store';

// 세션을 기기 단위로 구분하기 위해(스펙 §2.2) 로그인 시 플랫폼을 보낸다.
const DEVICE_PLATFORM = Platform.OS === 'ios' ? 'ios' : 'android';

export async function loginWithEmail(email: string, password: string): Promise<LoginToken> {
  const { data } = await apolloClient.mutate({
    mutation: LOGIN,
    variables: { input: { email, password, platform: DEVICE_PLATFORM } },
  });
  if (!data) throw new Error('login 응답이 비어 있습니다.');
  return data.login;
}

/** 이메일 가입(약관 동의 필수, 스펙 §2.6). 가입 후 로그인은 호출자가 이어서 한다. */
export async function signupWithEmail(input: { email: string; password: string; name: string }): Promise<void> {
  await apolloClient.mutate({
    mutation: SIGNUP,
    variables: { createUserInput: { ...input, agreeTerms: true } },
  });
}
