// refresh token rotation · access token 만료 · 기기(platform) 단위 세션 e2e.
import { JwtService } from '@nestjs/jwt';
import { createE2eApp, E2eApp } from './support/e2e-app';

describe('Auth session (e2e)', () => {
  let ctx: E2eApp;

  const LOGIN = `mutation($input: LoginDto!) { login(input: $input) { accessToken refreshToken expiresIn refreshExpiresIn } }`;
  const REFRESH = `mutation($refreshToken: String!, $platform: String) {
    refreshToken(refreshToken: $refreshToken, platform: $platform) { accessToken refreshToken expiresIn refreshExpiresIn }
  }`;

  async function signupAndLoginFull(input: Record<string, unknown> = {}) {
    const email = 'cook@eatme.test';
    const password = 'password123';
    await ctx.gql(
      `mutation($input: CreateUserInput!) { signup(createUserInput: $input) { id } }`,
      {
        input: { email, password, name: '요리사' },
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
        { id: user.id, email: user.email, autologin: false },
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

  it('login의 platform이 세션에 저장되고 refresh 후에도 유지된다', async () => {
    const login = await signupAndLoginFull({ platform: 'ios' });
    expect(ctx.prisma.session.rows[0].platform).toBe('ios');

    const res = await ctx.gql(REFRESH, { refreshToken: login.refreshToken });
    expect(res.errors).toBeUndefined();
    expect(ctx.prisma.session.rows).toHaveLength(1);
    expect(ctx.prisma.session.rows[0].platform).toBe('ios');
  });
});
