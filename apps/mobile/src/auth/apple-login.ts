import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { apolloClient } from '../api/client';
import { APPLE_LOGIN } from '../api/documents';
import type { LoginToken } from './token-store';

// 스펙 §2.4 Sign in with Apple(iOS만).
export type AppleLoginResult =
  | { kind: 'token'; token: LoginToken }
  | { kind: 'link'; ticket: string; provider: string }
  | { kind: 'cancelled' };

/** Apple 버튼 노출 여부: iOS이고 기기가 지원할 때만. */
export async function isAppleLoginAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Apple은 최초 로그인 때만 이름을 준다. 성·이름이 있으면 이어 붙이고 없으면 null(서버가 기존 이름 유지). */
export function formatAppleName(
  fullName: { givenName?: string | null; familyName?: string | null } | null | undefined,
): string | null {
  const parts = [fullName?.givenName, fullName?.familyName]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part);
  return parts.length ? parts.join(' ') : null;
}

function isCancelled(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'ERR_REQUEST_CANCELED';
}

/** Apple 인증 → appleLogin mutation. 네트워크·서버 오류(ACCOUNT_EXISTS 등)는 throw. */
export async function startAppleLogin(): Promise<AppleLoginResult> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if (isCancelled(error)) return { kind: 'cancelled' };
    throw error;
  }
  if (!credential.identityToken || !credential.authorizationCode) {
    throw new Error('Apple 인증 정보가 비어 있습니다.');
  }

  const { data } = await apolloClient.mutate({
    mutation: APPLE_LOGIN,
    variables: {
      input: {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        name: formatAppleName(credential.fullName),
        platform: 'ios',
      },
    },
  });
  const result = data?.appleLogin;
  if (result?.token) return { kind: 'token', token: result.token };
  if (result?.linkTicket) return { kind: 'link', ticket: result.linkTicket, provider: result.provider ?? 'apple' };
  throw new Error('appleLogin 응답이 비어 있습니다.');
}
