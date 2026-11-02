import { ApolloClient, ApolloLink, gql, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { Observable } from '@apollo/client/utilities';
import { createRefreshLink } from './refresh-link';
import type { StoredToken } from './token-store';

const QUERY = gql`
  query Item($n: Int!) {
    item(n: $n)
  }
`;

const unauthenticated = {
  data: null,
  errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHENTICATED' } }],
};

type Setup = {
  refresh: jest.Mock<Promise<StoredToken | null>, [string]>;
};

function setup({ refresh }: Setup) {
  let current: StoredToken | null = { accessToken: 'old', refreshToken: 'rt-old', expiresAt: 0 };
  const onRefreshed = jest.fn(async (t: StoredToken) => {
    current = t;
  });
  const onLogout = jest.fn(async () => {
    current = null;
  });
  const sentWith: string[] = [];

  // 서버 대역: access token이 'new'일 때만 성공한다. 응답은 비동기로 보내 동시 요청이 겹치게 한다.
  const server = new ApolloLink((operation) => {
    const auth = (operation.getContext().headers as Record<string, string> | undefined)
      ?.authorization;
    sentWith.push(auth ?? '');
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next(
          auth === 'Bearer new' ? { data: { item: operation.variables.n } } : unauthenticated,
        );
        observer.complete();
      }, 0);
    });
  });

  const authHeader = new SetContextLink(async (prev) => {
    const token = current;
    return {
      headers: {
        ...(prev.headers as Record<string, string> | undefined),
        ...(token ? { authorization: `Bearer ${token.accessToken}` } : {}),
      },
    };
  });

  const link = ApolloLink.from([
    createRefreshLink({ getToken: async () => current, refresh, onRefreshed, onLogout }),
    authHeader,
    server,
  ]);
  const client = new ApolloClient({ link, cache: new InMemoryCache() });
  return { client, onRefreshed, onLogout, sentWith };
}

describe('createRefreshLink', () => {
  it('동시 3개 요청이 UNAUTHENTICATED면 refresh는 1회만 호출하고 3개 모두 재시도해 성공한다', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const refresh = jest.fn(async (_rt: string) => {
      await gate;
      return { accessToken: 'new', refreshToken: 'rt-new', expiresAt: 1 } as StoredToken;
    });
    const { client, onRefreshed, onLogout, sentWith } = setup({ refresh });

    const results = Promise.all(
      [1, 2, 3].map((n) =>
        client.query({ query: QUERY, variables: { n }, fetchPolicy: 'no-cache' }),
      ),
    );
    // 3개 요청이 모두 실패 응답을 받은 뒤 refresh를 풀어준다.
    await new Promise((r) => setTimeout(r, 10));
    release();

    const settled = await results;
    expect(settled.map((r) => r.data)).toEqual([{ item: 1 }, { item: 2 }, { item: 3 }]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith('rt-old');
    expect(onRefreshed).toHaveBeenCalledTimes(1);
    expect(onLogout).not.toHaveBeenCalled();
    expect(sentWith.filter((a) => a === 'Bearer old')).toHaveLength(3);
    expect(sentWith.filter((a) => a === 'Bearer new')).toHaveLength(3);
  });

  it('refresh가 null이면 onLogout을 정확히 1회 호출하고 재시도하지 않는다', async () => {
    const refresh = jest.fn(async (_rt: string) => null);
    const { client, onRefreshed, onLogout, sentWith } = setup({ refresh });

    const results = await Promise.allSettled(
      [1, 2, 3].map((n) =>
        client.query({ query: QUERY, variables: { n }, fetchPolicy: 'no-cache' }),
      ),
    );

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onRefreshed).not.toHaveBeenCalled();
    // 최초 요청 3건만 나가고 재시도는 없다.
    expect(sentWith).toHaveLength(3);
  });

  it('재시도한 요청이 다시 UNAUTHENTICATED여도 무한 재시도하지 않는다', async () => {
    const refresh = jest.fn(
      async (_rt: string) => ({ accessToken: 'still-bad', refreshToken: 'rt2', expiresAt: 1 }) as StoredToken,
    );
    const { client, sentWith } = setup({ refresh });

    await expect(
      client.query({ query: QUERY, variables: { n: 1 }, fetchPolicy: 'no-cache' }),
    ).rejects.toThrow();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sentWith).toEqual(['Bearer old', 'Bearer still-bad']);
  });

  it('refresh가 throw(일시 장애)하면 로그아웃하지 않고 원래 오류를 돌려준다', async () => {
    const refresh = jest.fn(async (_rt: string): Promise<StoredToken | null> => {
      throw new Error('network down');
    });
    const { client, onLogout, sentWith } = setup({ refresh });

    await expect(
      client.query({ query: QUERY, variables: { n: 1 }, fetchPolicy: 'no-cache' }),
    ).rejects.toThrow();
    expect(onLogout).not.toHaveBeenCalled();
    expect(sentWith).toHaveLength(1);
  });
});
