// Sign in with Apple e2e: 로컬 ES256 키쌍으로 identityToken을 서명하고 Apple JWKS·토큰 엔드포인트를 대체한다(support/apple-e2e).
import { E2eApp } from './support/e2e-app';
import { createAppleE2eApp } from './support/apple-e2e';

describe('Apple login (e2e)', () => {
  let ctx: E2eApp;
  let identityToken: Awaited<ReturnType<typeof createAppleE2eApp>>['identityToken'];
  let appleLogin: Awaited<ReturnType<typeof createAppleE2eApp>>['appleLogin'];
  let setNextRefreshToken: (token: string | null) => void;
  let exchanged: string[];

  beforeAll(async () => {
    const apple = await createAppleE2eApp();
    ({ ctx, identityToken, appleLogin, setNextRefreshToken, exchanged } = apple);
  });

  afterAll(() => ctx?.app.close());
  beforeEach(() => {
    ctx.prisma.reset();
    exchanged.length = 0;
    setNextRefreshToken('apple-refresh-1');
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

    setNextRefreshToken(null);
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

  it('연동 티켓 + 기존 비밀번호로 연동하면 미리 교환한 Apple refresh token을 저장하고 ios 세션을 발급한다', async () => {
    await ctx.signupAndLogin('cook@eatme.test', 'password123');
    const login = await appleLogin({
      identityToken: await identityToken('cook@eatme.test'),
      platform: 'ios',
    });
    expect(exchanged).toEqual(['auth-code']);

    const res = await ctx.gql(
      `mutation($ticket: String!, $password: String!) {
        linkSocialAccount(ticket: $ticket, password: $password) { accessToken }
      }`,
      { ticket: login.data.appleLogin.linkTicket, password: 'password123' },
    );

    expect(res.errors).toBeUndefined();
    expect(res.data.linkSocialAccount.accessToken).toEqual(expect.any(String));
    const user = ctx.prisma.user.rows[0];
    expect(user.providers).toContain('apple');
    expect(user.appleRefreshToken).toBe('apple-refresh-1');
    // 가입 시 web 세션 1개 + 연동으로 발급된 ios 세션.
    const sessions = ctx.prisma.session.rows;
    expect(sessions.map((s) => s.platform)).toEqual(['web', 'ios']);
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
