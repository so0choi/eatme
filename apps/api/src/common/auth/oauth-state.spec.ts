import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { buildPostLoginRedirect, OAuthStateService } from './oauth-state';

const SECRET = 'unit-state-secret';

function makeService(secret = SECRET) {
  const config = {
    get: (key: string) => (key === 'JWT_SECRET' ? secret : undefined),
  };
  return new OAuthStateService(
    new JwtService({}),
    config as unknown as ConfigService,
  );
}

describe('OAuthStateService', () => {
  it.each(['web', 'mobile'] as const)(
    'sign → verify 왕복 시 client(%s)를 복원한다',
    (client) => {
      const service = makeService();
      expect(service.verify(service.sign(client))).toEqual({ client });
    },
  );

  it('매번 다른 nonce로 서로 다른 state를 만든다', () => {
    const service = makeService();
    expect(service.sign('web')).not.toBe(service.sign('web'));
  });

  it('변조된 state는 null', () => {
    const service = makeService();
    const state = service.sign('mobile');
    const tampered = state.slice(0, -2) + (state.endsWith('aa') ? 'bb' : 'aa');
    expect(service.verify(tampered)).toBeNull();
  });

  it('다른 시크릿으로 서명된 state는 null', () => {
    expect(
      makeService().verify(makeService('other-secret').sign('web')),
    ).toBeNull();
  });

  it('만료된 state는 null', () => {
    const state = new JwtService({}).sign(
      { typ: 'oauth_state', client: 'web', nonce: 'n' },
      { secret: SECRET, expiresIn: -10 },
    );
    expect(makeService().verify(state)).toBeNull();
  });

  it('state 타입이 아닌 토큰(access 등)은 null', () => {
    const access = new JwtService({}).sign(
      { typ: 'access', client: 'web', nonce: 'n' },
      { secret: SECRET, expiresIn: 60 },
    );
    expect(makeService().verify(access)).toBeNull();
  });

  it('client 값이 허용 목록 밖이면 null', () => {
    const state = new JwtService({}).sign(
      { typ: 'oauth_state', client: 'desktop', nonce: 'n' },
      { secret: SECRET, expiresIn: 60 },
    );
    expect(makeService().verify(state)).toBeNull();
  });

  it.each([undefined, '', 'not-a-jwt'])(
    '없거나 형식이 잘못된 state(%p)는 null',
    (state) => {
      expect(makeService().verify(state)).toBeNull();
    },
  );
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
