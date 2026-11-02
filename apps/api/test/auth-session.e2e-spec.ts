// refresh token rotation · access token 만료 · 기기(platform) 단위 세션 e2e.
import { JwtService } from '@nestjs/jwt';
import { createE2eApp, E2eApp } from './support/e2e-app';

describe('Auth session (e2e)', () => {
  let ctx: E2eApp;

  const LOGIN = `mutation($input: LoginDto!) { login(input: $input) { accessToken refreshToken expiresIn refreshExpiresIn } }`;
  const REFRESH = `mutation($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) { accessToken refreshToken expiresIn refreshExpiresIn }
  }`;
  const PROTECTED = `{ getAllIngredients { id } }`;
  const REFRESH_SECRET = 'e2e-refresh-secret';

  function sign(
    payload: Record<string, unknown>,
    options: Record<string, unknown> = {},
  ) {
    return ctx.app.get(JwtService).sign(payload, options);
  }

  function userPayload() {
    const user = ctx.prisma.user.rows[0];
    return { id: user.id, email: user.email, autologin: false };
  }

  async function signupAndLoginFull(input: Record<string, unknown> = {}) {
    const email = 'cook@eatme.test';
    const password = 'password123';
    await ctx.gql(
      `mutation($input: CreateUserInput!) { signup(createUserInput: $input) { id } }`,
      {
        input: { email, password, name: '요리사', agreeTerms: true },
      },
    );
    const res = await ctx.gql(LOGIN, { input: { email, password, ...input } });
    expect(res.errors).toBeUndefined();
    return res.data.login as {
      accessToken: string;
      refreshToken: string;
      refreshExpiresIn: number;
    };
  }

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(() => ctx?.app.close());
  beforeEach(() => ctx.prisma.reset());

  it('refresh 하면 새 토큰을 발급하고 세션 행을 교체한다', async () => {
    const login = await signupAndLoginFull();

    const res = await ctx.gql(REFRESH, { refreshToken: login.refreshToken });
    expect(res.errors).toBeUndefined();
    const next = res.data.refreshToken;
    expect(next.accessToken).toEqual(expect.any(String));
    expect(next.refreshToken).not.toBe(login.refreshToken);
    expect(next.refreshExpiresIn).toBe(login.refreshExpiresIn);

    expect(ctx.prisma.session.rows).toHaveLength(1);
    expect(ctx.prisma.session.rows[0].refreshToken).toBe(next.refreshToken);
    expect(
      ctx.prisma.session.rows.find(
        (r) => r.refreshToken === login.refreshToken,
      ),
    ).toBeUndefined();

    // 새 access token으로 보호된 쿼리 호출 가능
    const list = await ctx.gql(
      `{ getAllIngredients { id } }`,
      undefined,
      next.accessToken,
    );
    expect(list.errors).toBeUndefined();
  });

  it('autologin 세션은 rotation 후에도 30일 수명을 유지한다', async () => {
    const login = await signupAndLoginFull({ autologin: true });
    const res = await ctx.gql(REFRESH, { refreshToken: login.refreshToken });
    expect(res.data.refreshToken.refreshExpiresIn).toBe(60 * 60 * 24 * 30);
  });

  it('이미 사용한 refresh token으로 다시 호출하면 UNAUTHENTICATED', async () => {
    const login = await signupAndLoginFull();
    const first = await ctx.gql(REFRESH, { refreshToken: login.refreshToken });
    expect(first.errors).toBeUndefined();

    const second = await ctx.gql(REFRESH, { refreshToken: login.refreshToken });
    expect(second.data).toBeNull();
    expect(second.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(ctx.prisma.session.rows).toHaveLength(1);
  });

  it('서명이 잘못된 refresh token은 UNAUTHENTICATED', async () => {
    await signupAndLoginFull();
    const res = await ctx.gql(REFRESH, { refreshToken: 'not-a-jwt' });
    expect(res.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(ctx.prisma.session.rows).toHaveLength(1);
  });

  it('DB 세션이 만료됐으면 UNAUTHENTICATED', async () => {
    const login = await signupAndLoginFull();
    ctx.prisma.session.rows[0].expiresAt = new Date(Date.now() - 1000);
    const res = await ctx.gql(REFRESH, { refreshToken: login.refreshToken });
    expect(res.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('만료된 access token으로 보호된 쿼리를 호출하면 UNAUTHENTICATED', async () => {
    await signupAndLoginFull();
    const user = ctx.prisma.user.rows[0];
    const expired = ctx.app
      .get(JwtService)
      .sign(
        { id: user.id, email: user.email, autologin: false, typ: 'access' },
        { expiresIn: -10 },
      );

    const res = await ctx.gql(
      `{ getAllIngredients { id } }`,
      undefined,
      expired,
    );
    expect(res.data).toBeNull();
    expect(res.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('서명은 유효하지만 exp가 지난 refresh token은 UNAUTHENTICATED', async () => {
    await signupAndLoginFull();
    const expired = sign(
      { ...userPayload(), typ: 'refresh', jti: 'expired' },
      { secret: REFRESH_SECRET, expiresIn: -10 },
    );
    // DB 세션은 유효하게 두어 JWT exp 검증만으로 거부되는지 확인
    ctx.prisma.session.rows[0].refreshToken = expired;

    const res = await ctx.gql(REFRESH, { refreshToken: expired });
    expect(res.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(ctx.prisma.session.rows[0].refreshToken).toBe(expired);
  });

  it('refresh token을 Bearer access token으로 쓰면 UNAUTHENTICATED', async () => {
    const login = await signupAndLoginFull();
    const real = await ctx.gql(PROTECTED, undefined, login.refreshToken);
    expect(real.errors[0].extensions.code).toBe('UNAUTHENTICATED');

    // 시크릿이 같은 경우(폴백)를 가정: access 시크릿으로 서명된 refresh 타입 토큰도 거부
    const sameSecret = sign({ ...userPayload(), typ: 'refresh' });
    const res = await ctx.gql(PROTECTED, undefined, sameSecret);
    expect(res.data).toBeNull();
    expect(res.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('access token을 refreshToken에 넘기면 UNAUTHENTICATED', async () => {
    const login = await signupAndLoginFull();
    const real = await ctx.gql(REFRESH, { refreshToken: login.accessToken });
    expect(real.errors[0].extensions.code).toBe('UNAUTHENTICATED');

    // 시크릿이 같은 경우를 가정: refresh 시크릿으로 서명된 access 타입 토큰 + 세션 행이 있어도 거부
    const sameSecret = sign(
      { ...userPayload(), typ: 'access' },
      { secret: REFRESH_SECRET, expiresIn: 60 },
    );
    ctx.prisma.session.rows[0].refreshToken = sameSecret;
    const res = await ctx.gql(REFRESH, { refreshToken: sameSecret });
    expect(res.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(ctx.prisma.session.rows[0].refreshToken).toBe(sameSecret);
  });

  it('허용되지 않은 platform으로 login하면 BAD_REQUEST', async () => {
    await ctx.gql(
      `mutation($input: CreateUserInput!) { signup(createUserInput: $input) { id } }`,
      {
        input: {
          email: 'cook@eatme.test',
          password: 'password123',
          name: '요리사',
          agreeTerms: true,
        },
      },
    );
    const res = await ctx.gql(LOGIN, {
      input: {
        email: 'cook@eatme.test',
        password: 'password123',
        platform: 'tablet',
      },
    });
    expect(res.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect(ctx.prisma.session.rows).toHaveLength(0);
  });

  it('login의 platform이 세션에 저장되고 refresh 후에도 유지된다', async () => {
    const login = await signupAndLoginFull({ platform: 'ios' });
    expect(ctx.prisma.session.rows[0].platform).toBe('ios');

    const res = await ctx.gql(REFRESH, { refreshToken: login.refreshToken });
    expect(res.errors).toBeUndefined();
    expect(ctx.prisma.session.rows).toHaveLength(1);
    expect(ctx.prisma.session.rows[0].platform).toBe('ios');
  });
  describe('logout (기기 단위)', () => {
    const LOGOUT = `mutation($refreshToken: String!) { logout(refreshToken: $refreshToken) }`;

    async function loginAgain(input: Record<string, unknown>) {
      const res = await ctx.gql(LOGIN, {
        input: { email: 'cook@eatme.test', password: 'password123', ...input },
      });
      expect(res.errors).toBeUndefined();
      return res.data.login as { accessToken: string; refreshToken: string };
    }

    it('해당 기기(세션)만 삭제하고 다른 기기 세션은 유지한다', async () => {
      const web = await signupAndLoginFull({ platform: 'web' });
      const ios = await loginAgain({ platform: 'ios' });
      expect(ctx.prisma.session.rows).toHaveLength(2);

      const res = await ctx.gql(
        LOGOUT,
        { refreshToken: ios.refreshToken },
        ios.accessToken,
      );
      expect(res.errors).toBeUndefined();
      expect(res.data.logout).toBe(true);
      expect(ctx.prisma.session.rows).toHaveLength(1);
      expect(ctx.prisma.session.rows[0].refreshToken).toBe(web.refreshToken);
      expect(ctx.prisma.session.rows[0].platform).toBe('web');
    });

    it('타인의 refresh token으로는 아무 세션도 삭제하지 않는다', async () => {
      const mine = await signupAndLoginFull({ platform: 'web' });
      const other = await ctx.prisma.user.create({
        data: {
          email: 'other@eatme.test',
          password: 'x',
          name: '타인',
          provider: 'local',
        },
      });
      await ctx.prisma.session.create({
        data: {
          userId: other.id,
          refreshToken: 'other-refresh-token',
          expiresAt: new Date(Date.now() + 100000),
          platform: 'ios',
        },
      });

      const res = await ctx.gql(
        LOGOUT,
        { refreshToken: 'other-refresh-token' },
        mine.accessToken,
      );
      expect(res.errors).toBeUndefined();
      expect(ctx.prisma.session.rows).toHaveLength(2);
    });
  });
});
