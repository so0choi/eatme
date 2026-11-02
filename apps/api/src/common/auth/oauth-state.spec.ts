import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import {
  buildPostLoginRedirect,
  OAuthStateService,
  readCookie,
} from './oauth-state';

const SECRET = 'unit-state-secret';

function makeService(secret = SECRET, env: Record<string, string> = {}) {
  const values: Record<string, string> = { ...env, JWT_SECRET: secret };
  const config = { get: (key: string) => values[key] };
  return new OAuthStateService(
    new JwtService({}),
    config as unknown as ConfigService,
  );
}

const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'; // RFC 7636 예시

function cookieFor(nonce: string) {
  return `other=1; oauth_nonce=${encodeURIComponent(nonce)}; theme=dark`;
}

function signRaw(payload: Record<string, unknown>, expiresIn = 60) {
  return new JwtService({}).sign(payload, { secret: SECRET, expiresIn });
}

function nonceHash(nonce: string) {
  return createHash('sha256').update(nonce).digest('base64url');
}

describe('OAuthStateService.verifyWithCookie', () => {
  it('web: 서명·nonce 쿠키가 맞으면 { client: web }', () => {
    const service = makeService();
    const { state, nonce } = service.sign('web');
    expect(service.verifyWithCookie(state, cookieFor(nonce))).toEqual({
      client: 'web',
    });
  });

  it('mobile: codeChallenge를 함께 복원한다', () => {
    const service = makeService();
    const { state, nonce } = service.sign('mobile', CHALLENGE);
    expect(service.verifyWithCookie(state, cookieFor(nonce))).toEqual({
      client: 'mobile',
      codeChallenge: CHALLENGE,
    });
  });

  it('state에는 nonce 원문이 아니라 해시만 실린다', () => {
    const { state, nonce } = makeService().sign('web');
    const payload = new JwtService({}).decode<Record<string, unknown>>(state);
    expect(JSON.stringify(payload)).not.toContain(nonce);
    expect(payload.nonceHash).toBe(nonceHash(nonce));
  });

  it('매번 다른 nonce/state를 만든다', () => {
    const service = makeService();
    const a = service.sign('web');
    const b = service.sign('web');
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.state).not.toBe(b.state);
  });

  it('login-CSRF: 공격자가 발급받은 state를 다른 브라우저(쿠키 없음/다른 nonce)에서 쓰면 null', () => {
    const service = makeService();
    const attacker = service.sign('web');
    const victim = service.sign('web');
    expect(service.verifyWithCookie(attacker.state, undefined)).toBeNull();
    expect(service.verifyWithCookie(attacker.state, 'theme=dark')).toBeNull();
    expect(
      service.verifyWithCookie(attacker.state, cookieFor(victim.nonce)),
    ).toBeNull();
  });

  it('변조된 state는 null', () => {
    const service = makeService();
    const { state, nonce } = service.sign('mobile', CHALLENGE);
    const tampered = state.slice(0, -2) + (state.endsWith('aa') ? 'bb' : 'aa');
    expect(service.verifyWithCookie(tampered, cookieFor(nonce))).toBeNull();
  });

  it('다른 시크릿으로 서명된 state는 null', () => {
    const { state, nonce } = makeService('other-secret').sign('web');
    expect(makeService().verifyWithCookie(state, cookieFor(nonce))).toBeNull();
  });

  it('만료된 state는 null', () => {
    const state = signRaw(
      { typ: 'oauth_state', client: 'web', nonceHash: nonceHash('n') },
      -10,
    );
    expect(makeService().verifyWithCookie(state, cookieFor('n'))).toBeNull();
  });

  it('state 타입이 아닌 토큰(access 등)은 null', () => {
    const state = signRaw({
      typ: 'access',
      client: 'web',
      nonceHash: nonceHash('n'),
    });
    expect(makeService().verifyWithCookie(state, cookieFor('n'))).toBeNull();
  });

  it('client 값이 허용 목록 밖이면 null', () => {
    const state = signRaw({
      typ: 'oauth_state',
      client: 'desktop',
      nonceHash: nonceHash('n'),
    });
    expect(makeService().verifyWithCookie(state, cookieFor('n'))).toBeNull();
  });

  it('codeChallenge 없는 mobile state는 null(PKCE 필수)', () => {
    const service = makeService();
    const { state, nonce } = service.sign('mobile');
    expect(service.verifyWithCookie(state, cookieFor(nonce))).toBeNull();
  });

  it.each([undefined, '', 'not-a-jwt'])(
    '없거나 형식이 잘못된 state(%p)는 null',
    (state) => {
      expect(makeService().verifyWithCookie(state, cookieFor('n'))).toBeNull();
    },
  );
});

describe('nonce 쿠키', () => {
  it('httpOnly · SameSite=Lax · Path=/auth · Max-Age=300, http면 Secure 없음', () => {
    expect(makeService().nonceCookie('abc')).toBe(
      'oauth_nonce=abc; Path=/auth; Max-Age=300; HttpOnly; SameSite=Lax',
    );
  });

  it('API_BASE_URL이 https면 Secure', () => {
    expect(
      makeService(SECRET, {
        API_BASE_URL: 'https://api.eatme.app',
      }).nonceCookie('abc'),
    ).toMatch(/; Secure$/);
  });

  it('clearNonceCookie는 Max-Age=0', () => {
    expect(makeService().clearNonceCookie()).toContain(
      'oauth_nonce=; Path=/auth; Max-Age=0',
    );
  });

  it('readCookie는 이름이 정확히 일치하는 값만 꺼낸다', () => {
    expect(readCookie('xoauth_nonce=1; oauth_nonce=a%2Bb', 'oauth_nonce')).toBe(
      'a+b',
    );
    expect(readCookie(undefined, 'oauth_nonce')).toBeUndefined();
    expect(readCookie('a=1', 'oauth_nonce')).toBeUndefined();
  });
});

describe('buildPostLoginRedirect', () => {
  const bases = {
    webBaseUrl: 'http://web.test',
    mobileRedirectUri: 'eatme://',
  };

  it('web 인증 완료 → 웹 콜백으로 code 전달', () => {
    expect(
      buildPostLoginRedirect(
        { kind: 'authenticated', provider: 'google', code: 'c1' },
        'web',
        bases,
      ),
    ).toBe('http://web.test/auth/google/callback?code=c1');
  });

  it('web 연동 필요 → /link', () => {
    expect(
      buildPostLoginRedirect(
        { kind: 'link_required', provider: 'naver', ticket: 't1' },
        'web',
        bases,
      ),
    ).toBe('http://web.test/link?ticket=t1&provider=naver');
  });

  it('web 오류 → /login?error=', () => {
    expect(
      buildPostLoginRedirect(
        { kind: 'error', error: 'account_exists' },
        'web',
        bases,
      ),
    ).toBe('http://web.test/login?error=account_exists');
  });

  it('mobile 인증 완료 → 딥링크 auth/callback?code=', () => {
    expect(
      buildPostLoginRedirect(
        { kind: 'authenticated', provider: 'google', code: 'c1' },
        'mobile',
        bases,
      ),
    ).toBe('eatme://auth/callback?code=c1');
  });

  it('mobile 연동 필요 → 딥링크 link?ticket=&provider=', () => {
    expect(
      buildPostLoginRedirect(
        { kind: 'link_required', provider: 'google', ticket: 't1' },
        'mobile',
        bases,
      ),
    ).toBe('eatme://link?ticket=t1&provider=google');
  });

  it('mobile 오류 → 딥링크 auth/callback?error=', () => {
    expect(
      buildPostLoginRedirect(
        { kind: 'error', error: 'oauth' },
        'mobile',
        bases,
      ),
    ).toBe('eatme://auth/callback?error=oauth');
  });

  it('MOBILE_REDIRECT_URI 미설정이면 eatme:// 기본값', () => {
    expect(
      buildPostLoginRedirect(
        { kind: 'authenticated', provider: 'google', code: 'c1' },
        'mobile',
        {
          webBaseUrl: 'http://web.test',
        },
      ),
    ).toBe('eatme://auth/callback?code=c1');
  });

  it('쿼리 값은 URL 인코딩한다', () => {
    expect(
      buildPostLoginRedirect({ kind: 'error', error: 'a b&c' }, 'web', bases),
    ).toBe('http://web.test/login?error=a+b%26c');
  });
});
