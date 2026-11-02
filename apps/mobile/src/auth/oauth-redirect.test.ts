import { oauthErrorMessage, parseOAuthRedirect, resolveOAuthParams } from './oauth-redirect';

describe('parseOAuthRedirect', () => {
  it('auth/callback?code= → code', () => {
    expect(parseOAuthRedirect('eatme://auth/callback?code=abc123')).toEqual({ kind: 'code', code: 'abc123' });
  });

  it('link?ticket=&provider= → 연동 필요', () => {
    expect(parseOAuthRedirect('eatme://link?ticket=t%2B1&provider=google')).toEqual({
      kind: 'link',
      ticket: 't+1',
      provider: 'google',
    });
  });

  it('auth/callback?error= → error', () => {
    expect(parseOAuthRedirect('eatme://auth/callback?error=pkce_required')).toEqual({
      kind: 'error',
      error: 'pkce_required',
    });
  });

  it('Expo Go(exp://host/--/) 형식도 같은 경로로 해석한다', () => {
    expect(parseOAuthRedirect('exp://192.168.0.2:8081/--/auth/callback?code=xyz')).toEqual({
      kind: 'code',
      code: 'xyz',
    });
    expect(parseOAuthRedirect('exp://192.168.0.2:8081/--/link?ticket=t&provider=apple')).toEqual({
      kind: 'link',
      ticket: 't',
      provider: 'apple',
    });
  });

  it('필수 파라미터가 없으면 일반 오류', () => {
    expect(parseOAuthRedirect('eatme://auth/callback')).toEqual({ kind: 'error', error: 'oauth' });
    expect(parseOAuthRedirect('eatme://link?provider=google')).toEqual({ kind: 'error', error: 'oauth' });
  });

  it('앱 로그인 딥링크가 아니면 null', () => {
    expect(parseOAuthRedirect('eatme://fridge?code=abc')).toBeNull();
    expect(parseOAuthRedirect('https://example.com/auth/callback?code=abc')).toBeNull();
  });
});

describe('resolveOAuthParams', () => {
  it('라우트 파라미터(배열 포함)를 결과로 바꾼다', () => {
    expect(resolveOAuthParams({ code: 'c1' })).toEqual({ kind: 'code', code: 'c1' });
    expect(resolveOAuthParams({ code: ['c1', 'c2'] })).toEqual({ kind: 'code', code: 'c1' });
    expect(resolveOAuthParams({ ticket: 't', provider: 'google' })).toEqual({
      kind: 'link',
      ticket: 't',
      provider: 'google',
    });
    expect(resolveOAuthParams({ error: 'invalid_state', code: 'c1' })).toEqual({
      kind: 'error',
      error: 'invalid_state',
    });
    expect(resolveOAuthParams({})).toBeNull();
  });
});

describe('oauthErrorMessage', () => {
  it('사용자 취소는 조용히(null), 나머지는 안내 문구', () => {
    expect(oauthErrorMessage('access_denied')).toBeNull();
    expect(oauthErrorMessage('account_exists')).toContain('이미 다른 방식으로 가입된 이메일');
    for (const code of ['pkce_required', 'invalid_state', 'oauth']) {
      expect(oauthErrorMessage(code)).toBe('소셜 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  });
});
