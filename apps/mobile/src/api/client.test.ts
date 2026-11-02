import type { StoredToken } from '../auth/token-store';
import { logoutSession } from './client';

type Body = { query: string; variables: { refreshToken: string } };

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

const unauthenticated = { data: null, errors: [{ extensions: { code: 'UNAUTHENTICATED' } }] };

describe('logoutSession', () => {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>();
  const calls = () =>
    fetchMock.mock.calls.map(([, init]) => {
      const body = JSON.parse(init.body as string) as Body;
      return {
        op: body.query.includes('logout(') ? 'logout' : 'refresh',
        refreshToken: body.variables.refreshToken,
        authorization: (init.headers as Record<string, string>).authorization,
      };
    });

  const originalFetch = globalThis.fetch;
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('보내는 시점에 저장소에서 읽은 최신 토큰으로 로그아웃한다', async () => {
    let current: StoredToken = { accessToken: 'a1', refreshToken: 'r1', expiresAt: 0 };
    const getToken = jest.fn(async () => current);
    current = { accessToken: 'a2', refreshToken: 'r2', expiresAt: 0 }; // rotation 발생
    fetchMock.mockResolvedValue(jsonResponse({ data: { logout: true } }));

    await logoutSession(getToken);

    expect(calls()).toEqual([{ op: 'logout', refreshToken: 'r2', authorization: 'Bearer a2' }]);
  });

  it('UNAUTHENTICATED면 1회 갱신 후 새 refresh token으로 다시 로그아웃한다', async () => {
    const getToken = async (): Promise<StoredToken> => ({
      accessToken: 'expired',
      refreshToken: 'r1',
      expiresAt: 0,
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(unauthenticated))
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            refreshToken: { accessToken: 'a2', refreshToken: 'r2', expiresIn: 900, refreshExpiresIn: 1 },
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { logout: true } }));

    await logoutSession(getToken);

    expect(calls()).toEqual([
      { op: 'logout', refreshToken: 'r1', authorization: 'Bearer expired' },
      { op: 'refresh', refreshToken: 'r1', authorization: undefined },
      { op: 'logout', refreshToken: 'r2', authorization: 'Bearer a2' },
    ]);
  });

  it('토큰이 없으면 요청하지 않는다', async () => {
    await logoutSession(async () => null);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
