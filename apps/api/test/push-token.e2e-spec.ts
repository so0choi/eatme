// 푸시 토큰 등록(현재 세션에 연결) · 알림 설정 · access token의 세션(sid) 바인딩 e2e.
import { JwtService } from '@nestjs/jwt';
import { createE2eApp, E2eApp } from './support/e2e-app';

describe('Push token / notification settings (e2e)', () => {
  let ctx: E2eApp;

  const LOGIN = `mutation($input: LoginDto!) { login(input: $input) { accessToken refreshToken } }`;
  const REFRESH = `mutation($refreshToken: String!) { refreshToken(refreshToken: $refreshToken) { accessToken refreshToken } }`;
  const LOGOUT = `mutation($refreshToken: String!) { logout(refreshToken: $refreshToken) }`;
  const REGISTER = `mutation($token: String!, $platform: String!) { registerPushToken(token: $token, platform: $platform) }`;
  const SETTINGS = `mutation($pushEnabled: Boolean!, $pushHour: Int!) {
    updateNotificationSettings(pushEnabled: $pushEnabled, pushHour: $pushHour) { id pushEnabled pushHour }
  }`;
  const EXPO_TOKEN = 'ExponentPushToken[abc123]';

  async function signupAndLogin(email: string, platform = 'ios') {
    const password = 'password123';
    await ctx.gql(
      `mutation($input: CreateUserInput!) { signup(createUserInput: $input) { id } }`,
      { input: { email, password, name: '요리사', agreeTerms: true } },
    );
    const res = await ctx.gql(LOGIN, { input: { email, password, platform } });
    expect(res.errors).toBeUndefined();
    return res.data.login as { accessToken: string; refreshToken: string };
  }

  function sessionOf(refreshToken: string) {
    return ctx.prisma.session.rows.find(
      (s) => s.refreshToken === refreshToken,
    )!;
  }

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(() => ctx?.app.close());
  beforeEach(() => ctx.prisma.reset());

  describe('registerPushToken', () => {
    it('현재 세션에 연결된 토큰 행 1개를 만든다', async () => {
      const login = await signupAndLogin('cook@eatme.test');

      const res = await ctx.gql(
        REGISTER,
        { token: EXPO_TOKEN, platform: 'ios' },
        login.accessToken,
      );
      expect(res.errors).toBeUndefined();
      expect(res.data.registerPushToken).toBe(true);

      const session = sessionOf(login.refreshToken);
      expect(ctx.prisma.pushToken.rows).toHaveLength(1);
      expect(ctx.prisma.pushToken.rows[0]).toMatchObject({
        token: EXPO_TOKEN,
        platform: 'ios',
        sessionId: session.id,
        userId: session.userId,
      });
    });

    it('같은 토큰을 다시 등록해도 행은 1개다', async () => {
      const login = await signupAndLogin('cook@eatme.test');
      await ctx.gql(
        REGISTER,
        { token: EXPO_TOKEN, platform: 'ios' },
        login.accessToken,
      );
      await ctx.gql(
        REGISTER,
        { token: EXPO_TOKEN, platform: 'ios' },
        login.accessToken,
      );
      expect(ctx.prisma.pushToken.rows).toHaveLength(1);
    });

    it('같은 토큰을 다른 유저가 등록하면 소유자(세션·유저)가 옮겨간다', async () => {
      const first = await signupAndLogin('first@eatme.test');
      await ctx.gql(
        REGISTER,
        { token: EXPO_TOKEN, platform: 'ios' },
        first.accessToken,
      );

      const second = await signupAndLogin('second@eatme.test', 'android');
      const res = await ctx.gql(
        REGISTER,
        { token: EXPO_TOKEN, platform: 'android' },
        second.accessToken,
      );
      expect(res.errors).toBeUndefined();

      const session = sessionOf(second.refreshToken);
      expect(ctx.prisma.pushToken.rows).toHaveLength(1);
      expect(ctx.prisma.pushToken.rows[0]).toMatchObject({
        token: EXPO_TOKEN,
        platform: 'android',
        sessionId: session.id,
        userId: session.userId,
      });
    });

    it('refresh 후 새 access token으로도 같은 세션에 연결된다', async () => {
      const login = await signupAndLogin('cook@eatme.test');
      const sessionId = sessionOf(login.refreshToken).id;
      const refreshed = await ctx.gql(REFRESH, {
        refreshToken: login.refreshToken,
      });
      expect(refreshed.errors).toBeUndefined();

      await ctx.gql(
        REGISTER,
        { token: EXPO_TOKEN, platform: 'ios' },
        refreshed.data.refreshToken.accessToken,
      );
      expect(ctx.prisma.pushToken.rows[0].sessionId).toBe(sessionId);
    });

    it('해당 세션을 logout하면 그 기기의 토큰이 삭제된다', async () => {
      const ios = await signupAndLogin('cook@eatme.test', 'ios');
      const android = (
        await ctx.gql(LOGIN, {
          input: {
            email: 'cook@eatme.test',
            password: 'password123',
            platform: 'android',
          },
        })
      ).data.login;
      await ctx.gql(
        REGISTER,
        { token: EXPO_TOKEN, platform: 'ios' },
        ios.accessToken,
      );
      await ctx.gql(
        REGISTER,
        { token: 'ExponentPushToken[android]', platform: 'android' },
        android.accessToken,
      );
      expect(ctx.prisma.pushToken.rows).toHaveLength(2);

      const res = await ctx.gql(
        LOGOUT,
        { refreshToken: ios.refreshToken },
        ios.accessToken,
      );
      expect(res.errors).toBeUndefined();

      expect(ctx.prisma.pushToken.rows).toHaveLength(1);
      expect(ctx.prisma.pushToken.rows[0].token).toBe(
        'ExponentPushToken[android]',
      );
    });

    it('logout한 세션의 access token은 즉시 거부된다', async () => {
      const login = await signupAndLogin('cook@eatme.test');
      await ctx.gql(
        LOGOUT,
        { refreshToken: login.refreshToken },
        login.accessToken,
      );

      const res = await ctx.gql(
        REGISTER,
        { token: EXPO_TOKEN, platform: 'ios' },
        login.accessToken,
      );
      expect(res.errors[0].extensions?.code).toBe('UNAUTHENTICATED');
      expect(ctx.prisma.pushToken.rows).toHaveLength(0);
    });

    it('계정 삭제 후 access token은 거부되고 토큰도 남지 않는다', async () => {
      const login = await signupAndLogin('cook@eatme.test');
      await ctx.gql(
        REGISTER,
        { token: EXPO_TOKEN, platform: 'ios' },
        login.accessToken,
      );
      const del = await ctx.gql(
        `mutation { deleteAccount }`,
        undefined,
        login.accessToken,
      );
      expect(del.errors).toBeUndefined();

      expect(ctx.prisma.pushToken.rows).toHaveLength(0);
      const res = await ctx.gql(
        `{ profile { id } }`,
        undefined,
        login.accessToken,
      );
      expect(res.errors[0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it.each(['web', 'tablet'])(
      'platform %s는 BAD_REQUEST',
      async (platform) => {
        const login = await signupAndLogin('cook@eatme.test');
        const res = await ctx.gql(
          REGISTER,
          { token: EXPO_TOKEN, platform },
          login.accessToken,
        );
        expect(res.errors[0].extensions?.code).toBe('BAD_REQUEST');
        expect(ctx.prisma.pushToken.rows).toHaveLength(0);
      },
    );

    it('빈 토큰은 BAD_REQUEST', async () => {
      const login = await signupAndLogin('cook@eatme.test');
      const res = await ctx.gql(
        REGISTER,
        { token: '', platform: 'ios' },
        login.accessToken,
      );
      expect(res.errors[0].extensions?.code).toBe('BAD_REQUEST');
    });

    it('비로그인은 UNAUTHENTICATED', async () => {
      const res = await ctx.gql(REGISTER, {
        token: EXPO_TOKEN,
        platform: 'ios',
      });
      expect(res.errors[0].extensions?.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('access token 세션 바인딩(sid)', () => {
    it('sid 없는 access token은 거부된다', async () => {
      await signupAndLogin('cook@eatme.test');
      const user = ctx.prisma.user.rows[0];
      const noSid = ctx.app
        .get(JwtService)
        .sign({
          id: user.id,
          email: user.email,
          autologin: false,
          typ: 'access',
        });
      const res = await ctx.gql(`{ profile { id } }`, undefined, noSid);
      expect(res.errors[0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('다른 유저의 세션 sid를 넣은 access token은 거부된다', async () => {
      const other = await signupAndLogin('other@eatme.test');
      await signupAndLogin('cook@eatme.test');
      const me = ctx.prisma.user.rows.find(
        (u) => u.email === 'cook@eatme.test',
      )!;
      const forged = ctx.app.get(JwtService).sign({
        id: me.id,
        email: me.email,
        autologin: false,
        typ: 'access',
        sid: sessionOf(other.refreshToken).id,
      });
      const res = await ctx.gql(`{ profile { id } }`, undefined, forged);
      expect(res.errors[0].extensions?.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('updateNotificationSettings', () => {
    it('pushEnabled·pushHour를 저장하고 User를 돌려준다', async () => {
      const login = await signupAndLogin('cook@eatme.test');
      const res = await ctx.gql(
        SETTINGS,
        { pushEnabled: false, pushHour: 21 },
        login.accessToken,
      );
      expect(res.errors).toBeUndefined();
      expect(res.data.updateNotificationSettings).toMatchObject({
        pushEnabled: false,
        pushHour: 21,
      });
      expect(ctx.prisma.user.rows[0]).toMatchObject({
        pushEnabled: false,
        pushHour: 21,
      });

      const profile = await ctx.gql(
        `{ profile { pushEnabled pushHour } }`,
        undefined,
        login.accessToken,
      );
      expect(profile.data.profile).toEqual({
        pushEnabled: false,
        pushHour: 21,
      });
    });

    it.each([24, -1])('pushHour %d는 BAD_REQUEST', async (pushHour) => {
      const login = await signupAndLogin('cook@eatme.test');
      const res = await ctx.gql(
        SETTINGS,
        { pushEnabled: true, pushHour },
        login.accessToken,
      );
      expect(res.errors[0].extensions?.code).toBe('BAD_REQUEST');
      expect(ctx.prisma.user.rows[0].pushHour).toBe(9);
    });
  });
});
