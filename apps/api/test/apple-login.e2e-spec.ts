// Sign in with Apple e2e: 로컬 ES256 키쌍으로 identityToken을 서명하고 Apple JWKS·토큰 엔드포인트를 대체한다.
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  KeyLike,
  SignJWT,
} from 'jose';
import { APPLE_JWKS } from '@common/auth/apple/apple-identity.service';
import { AppleTokenClient } from '@common/auth/apple/apple-token.client';
import { createE2eApp, E2eApp } from './support/e2e-app';

describe('Apple login (e2e)', () => {
  let ctx: E2eApp;
  let privateKey: KeyLike;
  const exchanged: string[] = [];
  let nextRefreshToken: string | null = 'apple-refresh-1';

  const APPLE_LOGIN = `mutation($input: AppleLoginInput!) {
    appleLogin(input: $input) {
      token { accessToken refreshToken }
      linkTicket
      provider
    }
  }`;

  async function identityToken(
    email: string,
    overrides: { aud?: string; iss?: string } = {},
  ) {
    return new SignJWT({ email })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuer(overrides.iss ?? 'https://appleid.apple.com')
      .setAudience(overrides.aud ?? 'com.eatme.app')
      .setSubject(`apple-sub-${email}`)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  }

  async function appleLogin(input: Record<string, unknown>) {
    return ctx.gql(APPLE_LOGIN, {
      input: { authorizationCode: 'auth-code', ...input },
    });
  }

  beforeAll(async () => {
    const pair = await generateKeyPair('ES256');
    privateKey = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    const jwks = createLocalJWKSet({
      keys: [{ ...jwk, kid: 'test-key', alg: 'ES256' }],
    });

    ctx = await createE2eApp((b) =>
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
  });

  afterAll(() => ctx?.app.close());
  beforeEach(() => {
    ctx.prisma.reset();
    exchanged.length = 0;
    nextRefreshToken = 'apple-refresh-1';
  });

  it('신규 이메일이면 토큰을 발급하고 apple 계정 생성 + refresh token 저장', async () => {
    const res = await appleLogin({
      identityToken: await identityToken('new@privaterelay.appleid.com'),
      name: '애플요리사',
      platform: 'ios',
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.appleLogin.token.accessToken).toEqual(expect.any(String));
    expect(res.data.appleLogin.linkTicket).toBeNull();
    expect(exchanged).toEqual(['auth-code']);

    const user = ctx.prisma.user.rows[0];
    expect(user.email).toBe('new@privaterelay.appleid.com');
    expect(user.provider).toBe('apple');
    expect(user.name).toBe('애플요리사');
    expect(user.appleRefreshToken).toBe('apple-refresh-1');
    expect(ctx.prisma.session.rows[0].platform).toBe('ios');
  });

  it('두 번째 로그인에서 name을 생략해도 이름을 유지하고, 교환 실패(null)면 기존 토큰을 덮어쓰지 않는다', async () => {
    const token = await identityToken('again@eatme.test');
    await appleLogin({ identityToken: token, name: '처음이름' });

    nextRefreshToken = null;
    const res = await appleLogin({ identityToken: token });

    expect(res.errors).toBeUndefined();
    expect(res.data.appleLogin.token.accessToken).toEqual(expect.any(String));
    const user = ctx.prisma.user.rows[0];
    expect(user.name).toBe('처음이름');
    expect(user.appleRefreshToken).toBe('apple-refresh-1');
  });

  it('신규 가입에서 name을 생략하면 이름은 email', async () => {
    const res = await appleLogin({
      identityToken: await identityToken('noname@eatme.test'),
    });

    expect(res.errors).toBeUndefined();
    expect(ctx.prisma.user.rows[0].name).toBe('noname@eatme.test');
  });

  it('aud가 번들 ID와 다르면 UNAUTHENTICATED', async () => {
    const res = await appleLogin({
      identityToken: await identityToken('aud@eatme.test', {
        aud: 'com.other.app',
      }),
    });

    expect(res.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    expect(ctx.prisma.user.rows).toHaveLength(0);
    expect(exchanged).toHaveLength(0);
  });

  it('같은 이메일의 local 계정이 있으면 linkTicket을 돌려주고 token은 null', async () => {
    await ctx.signupAndLogin('cook@eatme.test');

    const res = await appleLogin({
      identityToken: await identityToken('cook@eatme.test'),
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.appleLogin.token).toBeNull();
    expect(res.data.appleLogin.linkTicket).toEqual(expect.any(String));
    expect(res.data.appleLogin.provider).toBe('apple');
    expect(ctx.prisma.user.rows[0].appleRefreshToken).toBeNull();
  });

  it('비밀번호 없는 소셜 계정과 충돌하면 ACCOUNT_EXISTS', async () => {
    await ctx.prisma.user.create({
      data: {
        email: 'social@eatme.test',
        provider: 'google',
        providers: ['google'],
        password: 'google:placeholder',
        name: '구글유저',
      },
    });

    const res = await appleLogin({
      identityToken: await identityToken('social@eatme.test'),
    });

    expect(res.errors?.[0].message).toBe('ACCOUNT_EXISTS');
    expect(res.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
  });
});
