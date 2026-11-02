import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  needsRefresh,
  parseStoredToken,
  refreshTokens,
  REFRESH_MARGIN_MS,
} from './token-refresh';

const NOW = 1_800_000_000_000;

describe('needsRefresh', () => {
  it('만료까지 60초보다 많이 남았으면 false', () => {
    expect(needsRefresh({ expiresAt: NOW + REFRESH_MARGIN_MS + 1 }, NOW)).toBe(false);
  });

  it('만료까지 정확히 60초 남았으면 true', () => {
    expect(needsRefresh({ expiresAt: NOW + REFRESH_MARGIN_MS }, NOW)).toBe(true);
  });

  it('60초 이내면 true', () => {
    expect(needsRefresh({ expiresAt: NOW + 1_000 }, NOW)).toBe(true);
  });

  it('이미 만료됐으면 true', () => {
    expect(needsRefresh({ expiresAt: NOW - 1 }, NOW)).toBe(true);
  });

  it('expiresAt이 숫자가 아니면 true(갱신 시도)', () => {
    expect(needsRefresh({ expiresAt: Number.NaN }, NOW)).toBe(true);
  });
});

describe('parseStoredToken', () => {
  it('유효한 쿠키 JSON을 파싱한다', () => {
    const raw = JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: NOW });
    expect(parseStoredToken(raw)).toEqual({ accessToken: 'a', refreshToken: 'r', expiresAt: NOW });
  });

  it('깨진 값이나 필드 누락이면 null', () => {
    expect(parseStoredToken(undefined)).toBeNull();
    expect(parseStoredToken('not-json')).toBeNull();
    expect(parseStoredToken(JSON.stringify({ accessToken: 'a' }))).toBeNull();
  });
});

describe('refreshTokens', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(response: { status?: number; body?: unknown } | Error) {
    const fetchMock = vi.fn(async () => {
      if (response instanceof Error) throw response;
      const status = response.status ?? 200;
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => {
          if (response.body === undefined) throw new SyntaxError('Unexpected end of JSON');
          return response.body;
        },
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  function gqlError(code: string) {
    return { data: null, errors: [{ message: code, extensions: { code } }] };
  }

  it('성공하면 새 토큰과 ms 단위 expiresAt을 돌려준다', async () => {
    const fetchMock = stubFetch({
      body: {
        data: {
          refreshToken: {
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            expiresIn: 900,
            refreshExpiresIn: 604800,
          },
        },
      },
    });

    const result = await refreshTokens('http://api.test', 'old-refresh', { now: NOW });

    expect(result).toEqual({
      ok: true,
      token: {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresAt: NOW + 900 * 1000,
        refreshExpiresIn: 604800,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/graphql');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-forwarded-for']).toBeUndefined();
    const body = JSON.parse(init.body as string);
    expect(body.variables).toEqual({ refreshToken: 'old-refresh' });
    expect(body.query).toContain('refreshToken(refreshToken: $refreshToken)');
  });

  it('forwardedFor가 있으면 x-forwarded-for 헤더로 보낸다', async () => {
    const fetchMock = stubFetch(new Error('stop'));
    await refreshTokens('http://api.test', 'old', { now: NOW, forwardedFor: '203.0.113.7' });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['x-forwarded-for']).toBe('203.0.113.7');
  });

  it('GraphQL UNAUTHENTICATED면 unauthenticated', async () => {
    stubFetch({ body: gqlError('UNAUTHENTICATED') });
    await expect(refreshTokens('http://api.test', 'old', { now: NOW })).resolves.toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
  });

  it('TOO_MANY_REQUESTS면 transient', async () => {
    stubFetch({ body: gqlError('TOO_MANY_REQUESTS') });
    await expect(refreshTokens('http://api.test', 'old', { now: NOW })).resolves.toEqual({
      ok: false,
      reason: 'transient',
    });
  });

  it('그 밖의 GraphQL 에러면 transient', async () => {
    stubFetch({ body: gqlError('INTERNAL_ERROR') });
    await expect(refreshTokens('http://api.test', 'old', { now: NOW })).resolves.toEqual({
      ok: false,
      reason: 'transient',
    });
  });

  it('HTTP 5xx면 transient', async () => {
    stubFetch({ status: 502 });
    await expect(refreshTokens('http://api.test', 'old', { now: NOW })).resolves.toEqual({
      ok: false,
      reason: 'transient',
    });
  });

  it('응답이 JSON이 아니면 transient', async () => {
    stubFetch({ status: 404 });
    await expect(refreshTokens('http://api.test', 'old', { now: NOW })).resolves.toEqual({
      ok: false,
      reason: 'transient',
    });
  });

  it('네트워크 에러면 transient', async () => {
    stubFetch(new Error('ECONNREFUSED'));
    await expect(refreshTokens('http://api.test', 'old', { now: NOW })).resolves.toEqual({
      ok: false,
      reason: 'transient',
    });
  });
});
