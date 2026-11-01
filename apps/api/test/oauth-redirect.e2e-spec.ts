// OAuth 진입 리다이렉트: authorize URL에 서명된 state가 실리고, 그 state가 client를 담는지 검증.
// (콜백 분기는 passport 토큰 교환이 필요해 e2e 대신 buildPostLoginRedirect 단위 테스트로 검증)
import { AuthController } from '@common/auth/auth.controller';
import { OAuthStateService } from '@common/auth/oauth-state';
import { createE2eApp, E2eApp } from './support/e2e-app';

describe('OAuth redirect (e2e)', () => {
  let ctx: E2eApp;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(() => ctx?.app.close());

  function stateOf(location: string) {
    return new URL(location).searchParams.get('state');
  }

  it.each([
    ['google', 'https://accounts.google.com/'],
    ['naver', 'https://nid.naver.com/'],
  ])(
    'GET /auth/%s?client=mobile → 302, Location에 mobile state 포함',
    async (provider, host) => {
      const res = await ctx.app.inject({
        method: 'GET',
        url: `/auth/${provider}?client=mobile`,
      });

      expect(res.statusCode).toBe(302);
      const location = res.headers.location as string;
      expect(location.startsWith(host)).toBe(true);
      expect(location).toContain('state=');
      const state = stateOf(location);
      expect(ctx.app.get(OAuthStateService).verify(state ?? undefined)).toEqual(
        { client: 'mobile' },
      );
    },
  );

  it('client 미지정이면 web state', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/auth/google' });

    expect(res.statusCode).toBe(302);
    const state = stateOf(res.headers.location as string);
    expect(ctx.app.get(OAuthStateService).verify(state ?? undefined)).toEqual({
      client: 'web',
    });
  });

  it('허용되지 않은 client 값은 web으로 취급(요청이 멈추지 않음)', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/auth/google?client=evil',
    });

    expect(res.statusCode).toBe(302);
    const state = stateOf(res.headers.location as string);
    expect(ctx.app.get(OAuthStateService).verify(state ?? undefined)).toEqual({
      client: 'web',
    });
  });

  // passport 가드는 실제 제공자 토큰 교환이 필요하므로 가드를 건너뛰고 DI로 구성된 핸들러를 직접 호출한다.
  describe('콜백 핸들러', () => {
    const req = (email = 'social@eatme.test') =>
      ({ user: { email, name: '소셜', provider: 'google' } }) as never;

    it.each([undefined, '', 'forged'])(
      'state가 %p이면 웹 /login?error=invalid_state',
      async (state) => {
        const res = await ctx.app
          .get(AuthController)
          .googleCallback(req(), state);
        expect(res).toEqual({
          url: 'http://localhost:3000/login?error=invalid_state',
          statusCode: 302,
        });
      },
    );

    it('mobile state + 인증 완료 → 딥링크로 일회용 code 전달', async () => {
      const state = ctx.app.get(OAuthStateService).sign('mobile');
      const res = await ctx.app
        .get(AuthController)
        .googleCallback(req(), state);
      expect(res.statusCode).toBe(302);
      expect(res.url).toMatch(/^eatme:\/\/auth\/callback\?code=[^&]+$/);
    });

    it('web state + 인증 완료 → 웹 콜백으로 code 전달', async () => {
      const state = ctx.app.get(OAuthStateService).sign('web');
      const res = await ctx.app
        .get(AuthController)
        .naverCallback(req('naver@eatme.test'), state);
      expect(res.url).toMatch(
        /^http:\/\/localhost:3000\/auth\/naver\/callback\?code=[^&]+$/,
      );
    });
  });
});
