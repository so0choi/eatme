// OAuth 진입/콜백 리다이렉트 e2e: 서명 state + 브라우저 nonce 쿠키 바인딩, 모바일 PKCE, 제공자 오류 처리.
// passport 토큰 교환이 필요한 성공 경로는 가드를 건너뛰고 DI로 구성된 핸들러를 직접 호출한다.
import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from '@common/auth/auth.controller';
import { OAuthStateService } from '@common/auth/oauth-state';
import { createE2eApp, E2eApp } from './support/e2e-app';

// RFC 7636 Appendix B 예시 쌍
const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

const EXCHANGE = `mutation($code: String!, $codeVerifier: String) {
  exchangeOAuthCode(code: $code, codeVerifier: $codeVerifier) { accessToken }
}`;

describe('OAuth redirect (e2e)', () => {
  let ctx: E2eApp;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(() => ctx?.app.close());
  beforeEach(() => ctx.prisma.reset());

  const stateService = () => ctx.app.get(OAuthStateService);

  function setCookies(headers: Record<string, unknown>): string[] {
    const raw = headers['set-cookie'];
    if (!raw) return [];
    return Array.isArray(raw) ? (raw as string[]) : [raw as string];
  }

  /** Set-Cookie에서 `name=value`만 뽑아 요청용 cookie 헤더로 만든다. */
  function cookieHeaderFrom(headers: Record<string, unknown>) {
    return setCookies(headers)
      .map((c) => c.split(';')[0])
      .join('; ');
  }

  async function start(url: string) {
    const res = await ctx.app.inject({ method: 'GET', url });
    const location = res.headers.location as string;
    return {
      res,
      location,
      state: location ? new URL(location).searchParams.get('state') : null,
      cookie: cookieHeaderFrom(res.headers),
    };
  }

  describe('진입 GET /auth/{provider}', () => {
    it.each([
      ['google', 'https://accounts.google.com/'],
      ['naver', 'https://nid.naver.com/'],
    ])(
      '%s?client=mobile&code_challenge → 302, state + nonce 쿠키가 서로 묶인다',
      async (provider, host) => {
        const { res, location, state, cookie } = await start(
          `/auth/${provider}?client=mobile&code_challenge=${CHALLENGE}`,
        );

        expect(res.statusCode).toBe(302);
        expect(location.startsWith(host)).toBe(true);
        expect(location).toContain('state=');

        const [setCookie] = setCookies(res.headers);
        expect(setCookie).toMatch(/^oauth_nonce=[^;]+; /);
        expect(setCookie).toContain('Path=/auth');
        expect(setCookie).toContain('Max-Age=300');
        expect(setCookie).toContain('HttpOnly');
        expect(setCookie).toContain('SameSite=Lax');

        const nonce = decodeURIComponent(cookie.replace('oauth_nonce=', ''));
        const payload = ctx.app
          .get(JwtService)
          .decode<Record<string, unknown>>(state!);
        expect(payload.nonceHash).toBe(
          createHash('sha256').update(nonce).digest('base64url'),
        );
        expect(stateService().verifyWithCookie(state!, cookie)).toEqual({
          client: 'mobile',
          codeChallenge: CHALLENGE,
        });
      },
    );

    it('client 미지정이면 web state', async () => {
      const { res, state, cookie } = await start('/auth/google');
      expect(res.statusCode).toBe(302);
      expect(stateService().verifyWithCookie(state!, cookie)).toEqual({
        client: 'web',
      });
    });

    it('허용되지 않은 client 값은 web으로 취급(요청이 멈추지 않음)', async () => {
      const { res, state, cookie } = await start('/auth/google?client=evil');
      expect(res.statusCode).toBe(302);
      expect(stateService().verifyWithCookie(state!, cookie)).toEqual({
        client: 'web',
      });
    });

    it.each(['', '&code_challenge=too-short'])(
      'mobile인데 code_challenge가 없거나 잘못되면(%p) 딥링크 pkce_required',
      async (extra) => {
        const { res, location } = await start(
          `/auth/google?client=mobile${extra}`,
        );
        expect(res.statusCode).toBe(302);
        expect(location).toBe('eatme://auth/callback?error=pkce_required');
        expect(setCookies(res.headers)).toEqual([]);
      },
    );
  });

  describe('콜백 사전 검증(passport 이전)', () => {
    async function callback(query: string, cookie?: string) {
      return ctx.app.inject({
        method: 'GET',
        url: `/auth/google/callback?${query}`,
        headers: cookie ? { cookie } : {},
      });
    }

    function expectCookieCleared(headers: Record<string, unknown>) {
      expect(setCookies(headers).join('\n')).toMatch(
        /oauth_nonce=; Path=\/auth; Max-Age=0/,
      );
    }

    it('state 없음 → 웹 /login?error=invalid_state, 쿠키 삭제', async () => {
      const res = await callback('code=x');
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(
        'http://localhost:3000/login?error=invalid_state',
      );
      expectCookieCleared(res.headers);
    });

    it('login-CSRF: 유효한 state라도 nonce 쿠키가 없거나 다르면 invalid_state', async () => {
      const attacker = await start('/auth/google');
      const victim = await start('/auth/google');

      for (const cookie of [undefined, victim.cookie]) {
        const res = await callback(
          `code=x&state=${encodeURIComponent(attacker.state!)}`,
          cookie,
        );
        expect(res.headers.location).toBe(
          'http://localhost:3000/login?error=invalid_state',
        );
      }
    });

    it('제공자 취소(error=access_denied) + 유효한 mobile state/쿠키 → 딥링크로 오류 전달', async () => {
      const { state, cookie } = await start(
        `/auth/google?client=mobile&code_challenge=${CHALLENGE}`,
      );
      const res = await callback(
        `error=access_denied&state=${encodeURIComponent(state!)}`,
        cookie,
      );
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(
        'eatme://auth/callback?error=access_denied',
      );
      expectCookieCleared(res.headers);
    });

    it('제공자 취소 + web state → 웹 /login?error=access_denied', async () => {
      const { state, cookie } = await start('/auth/naver');
      const res = await ctx.app.inject({
        method: 'GET',
        url: `/auth/naver/callback?error=access_denied&state=${encodeURIComponent(state!)}`,
        headers: { cookie },
      });
      expect(res.headers.location).toBe(
        'http://localhost:3000/login?error=access_denied',
      );
    });

    it('형식 밖의 제공자 error 값은 oauth로 뭉갠다', async () => {
      const { state, cookie } = await start('/auth/google');
      const res = await callback(
        `error=${encodeURIComponent('<script>')}&state=${encodeURIComponent(state!)}`,
        cookie,
      );
      expect(res.headers.location).toBe(
        'http://localhost:3000/login?error=oauth',
      );
    });
  });

  describe('콜백 성공 경로 + PKCE code 교환', () => {
    const reply = () => ({ header: jest.fn() }) as never;
    const req = (client: 'web' | 'mobile', email = 'social@eatme.test') =>
      ({
        user: { email, name: '소셜', provider: 'google' },
        oauthCallback: {
          kind: 'ok',
          state:
            client === 'mobile'
              ? { client, codeChallenge: CHALLENGE }
              : { client },
        },
      }) as never;

    async function mobileCode() {
      const res = await ctx.app
        .get(AuthController)
        .googleCallback(req('mobile'), reply());
      expect(res.url).toMatch(/^eatme:\/\/auth\/callback\?code=[^&]+$/);
      return new URL(res.url.replace('eatme://', 'http://x/')).searchParams.get(
        'code',
      )!;
    }

    it('mobile code + 올바른 verifier → 토큰 발급', async () => {
      const code = await mobileCode();
      const res = await ctx.gql(EXCHANGE, { code, codeVerifier: VERIFIER });
      expect(res.errors).toBeUndefined();
      expect(res.data.exchangeOAuthCode.accessToken).toEqual(
        expect.any(String),
      );
    });

    it.each([
      ['틀린 verifier', 'x'.repeat(43)],
      ['verifier 없음', undefined],
    ])('mobile code + %s → UNAUTHENTICATED, code도 폐기', async (_, v) => {
      const code = await mobileCode();
      const res = await ctx.gql(EXCHANGE, { code, codeVerifier: v });
      expect(res.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');

      const retry = await ctx.gql(EXCHANGE, { code, codeVerifier: VERIFIER });
      expect(retry.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('web code는 verifier 없이 교환된다', async () => {
      const res = await ctx.app
        .get(AuthController)
        .naverCallback(req('web', 'naver@eatme.test'), reply());
      expect(res.url).toMatch(
        /^http:\/\/localhost:3000\/auth\/naver\/callback\?code=[^&]+$/,
      );
      const code = new URL(res.url).searchParams.get('code')!;
      const exchanged = await ctx.gql(EXCHANGE, { code });
      expect(exchanged.errors).toBeUndefined();
      expect(exchanged.data.exchangeOAuthCode.accessToken).toEqual(
        expect.any(String),
      );
    });
  });
});
