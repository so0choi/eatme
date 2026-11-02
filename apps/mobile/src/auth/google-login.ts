import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { API_BASE_URL, apolloClient } from '../api/client';
import { EXCHANGE_OAUTH_CODE } from '../api/documents';
import { type OAuthRedirect, parseOAuthRedirect } from './oauth-redirect';
import { createCodeChallenge, createCodeVerifier } from './pkce';
import type { LoginToken } from './token-store';

// 스펙 §2.3 Google 로그인(PKCE 필수).
// verifier는 진행 중인 로그인 하나만 메모리에 둔다. Android에서 OS가 딥링크로 콜백 화면을 직접 열어도
// 같은 verifier로 교환할 수 있게 모듈 상태로 보관한다.
let pendingVerifier: string | null = null;
// iOS/Android에서 auth 세션 결과와 딥링크 콜백 화면이 같은 code를 동시에 처리할 수 있어 교환을 한 번으로 묶는다.
let inflightExchange: { code: string; promise: Promise<LoginToken> } | null = null;

export type GoogleLoginResult = OAuthRedirect | { kind: 'cancelled' };

const sha256Base64 = (input: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });

/** 시스템 브라우저로 Google 로그인을 진행하고 앱으로 돌아온 결과를 돌려준다. */
export async function startGoogleLogin(): Promise<GoogleLoginResult> {
  const verifier = createCodeVerifier(Crypto.getRandomBytes(32));
  const challenge = await createCodeChallenge(verifier, sha256Base64);
  pendingVerifier = verifier;

  const url = `${API_BASE_URL}/auth/google?client=mobile&code_challenge=${challenge}&platform=${Platform.OS}`;
  // 반환 URL은 앱 루트(`eatme://`, Expo Go는 `exp://host:port`). 서버는 `…auth/callback?…` 또는
  // 연동 필요 시 `…link?…`로 보내므로 둘 다 세션을 닫도록 접두사만 맞춘다(경로 검증은 parseOAuthRedirect).
  const result = await WebBrowser.openAuthSessionAsync(url, Linking.createURL(''));
  if (result.type !== 'success') return { kind: 'cancelled' };
  return parseOAuthRedirect(result.url) ?? { kind: 'error', error: 'oauth' };
}

/** 일회용 code를 토큰으로 교환한다(진행 중인 로그인의 verifier 사용, 같은 code는 한 번만 요청). */
export function exchangeGoogleCode(code: string): Promise<LoginToken> {
  if (inflightExchange?.code === code) return inflightExchange.promise;
  const codeVerifier = pendingVerifier;
  const exchange = (async () => {
    const { data } = await apolloClient.mutate({
      mutation: EXCHANGE_OAUTH_CODE,
      variables: { code, codeVerifier },
    });
    if (!data) throw new Error('exchangeOAuthCode 응답이 비어 있습니다.');
    return data.exchangeOAuthCode;
  })();
  // code는 일회용이라 성공·실패와 무관하게 교환이 끝나면 verifier와 진행 상태를 버린다.
  const promise = exchange.finally(() => {
    if (pendingVerifier === codeVerifier) pendingVerifier = null;
    if (inflightExchange?.promise === promise) inflightExchange = null;
  });
  inflightExchange = { code, promise };
  return promise;
}

/** 로그인 화면을 떠날 때 진행 중이던 Google 로그인 상태(verifier·교환 공유)를 버린다. */
export function resetGoogleLogin(): void {
  pendingVerifier = null;
  inflightExchange = null;
}
