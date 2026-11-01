// Apple 로그인 e2e 공용 헬퍼: 로컬 ES256 키쌍으로 identityToken을 서명하고 Apple JWKS·토큰 엔드포인트를 대체한다.
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from 'jose';
import { APPLE_JWKS } from '@common/auth/apple/apple-identity.service';
import { AppleTokenClient } from '@common/auth/apple/apple-token.client';
import { createE2eApp, E2eApp, GqlResponse } from './e2e-app';

export const APPLE_LOGIN = `mutation($input: AppleLoginInput!) {
  appleLogin(input: $input) {
    token { accessToken refreshToken }
    linkTicket
    provider
  }
}`;

export interface AppleE2eApp {
  ctx: E2eApp;
  /** exchangeCode가 받은 authorizationCode 기록 */
  exchanged: string[];
  /** 다음 exchangeCode가 돌려줄 Apple refresh token */
  setNextRefreshToken: (token: string | null) => void;
  identityToken: (
    email: string,
    overrides?: { aud?: string; iss?: string },
  ) => Promise<string>;
  appleLogin: (input: Record<string, unknown>) => Promise<GqlResponse>;
}

export async function createAppleE2eApp(): Promise<AppleE2eApp> {
  const pair = await generateKeyPair('ES256');
  const jwk = await exportJWK(pair.publicKey);
  const jwks = createLocalJWKSet({
    keys: [{ ...jwk, kid: 'test-key', alg: 'ES256' }],
  });
  const exchanged: string[] = [];
  let nextRefreshToken: string | null = 'apple-refresh-1';

  const ctx = await createE2eApp((b) =>
    b
      .overrideProvider(APPLE_JWKS)
      .useValue(jwks)
      .overrideProvider(AppleTokenClient)
      .useValue({
        exchangeCode: async (code: string) => {
          exchanged.push(code);
          return nextRefreshToken;
        },
        revoke: async () => undefined,
      }),
  );

  const identityToken: AppleE2eApp['identityToken'] = (email, overrides = {}) =>
    new SignJWT({ email })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuer(overrides.iss ?? 'https://appleid.apple.com')
      .setAudience(overrides.aud ?? 'com.eatme.app')
      .setSubject(`apple-sub-${email}`)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(pair.privateKey);

  return {
    ctx,
    exchanged,
    setNextRefreshToken: (token) => {
      nextRefreshToken = token;
    },
    identityToken,
    appleLogin: (input) =>
      ctx.gql(APPLE_LOGIN, {
        input: { authorizationCode: 'auth-code', ...input },
      }),
  };
}
