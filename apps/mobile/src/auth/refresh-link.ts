import { ApolloLink } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ErrorLink } from '@apollo/client/link/error';
import { Observable } from '@apollo/client/utilities';
import type { StoredToken } from './token-store';

export type RefreshLinkOptions = {
  getToken: () => Promise<StoredToken | null>;
  // refresh token이 거부되면 null, 네트워크 등 일시 장애면 throw.
  refresh: (refreshToken: string) => Promise<StoredToken | null>;
  onRefreshed: (token: StoredToken) => Promise<void> | void;
  onLogout: () => Promise<void> | void;
};

const RETRIED = 'eatmeAuthRetried';

function isUnauthenticated(error: unknown): boolean {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((e) => e.extensions?.code === 'UNAUTHENTICATED')
  );
}

// UNAUTHENTICATED 응답을 받으면 토큰을 갱신하고 원 요청을 1회 재시도한다.
// refresh token은 rotation(1회용)이라 동시 요청이 겹쳐도 갱신은 한 번만(single-flight) 한다.
// 재시도는 forward로 다시 내려가므로 하위 링크(인증 헤더)가 갱신된 토큰을 읽는다.
export function createRefreshLink({
  getToken,
  refresh,
  onRefreshed,
  onLogout,
}: RefreshLinkOptions): ApolloLink {
  let inflight: Promise<StoredToken | null> | null = null;

  const refreshOnce = (): Promise<StoredToken | null> => {
    if (!inflight) {
      inflight = (async () => {
        const current = await getToken();
        // 이미 로그아웃된 상태(늦게 도착한 실패 응답 등)면 onLogout을 다시 부르지 않는다.
        if (!current) return null;
        const next = await refresh(current.refreshToken);
        if (next) {
          await onRefreshed(next);
        } else {
          await onLogout();
        }
        return next;
      })().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };

  return new ErrorLink(({ error, result, operation, forward }) => {
    if (!isUnauthenticated(error) || operation.getContext()[RETRIED]) return;

    return new Observable<ApolloLink.Result>((observer) => {
      let sub: { unsubscribe(): void } | undefined;
      let closed = false;
      const giveUp = () => {
        if (result) {
          observer.next(result);
          observer.complete();
        } else {
          observer.error(error);
        }
      };

      refreshOnce().then(
        (token) => {
          if (closed) return;
          if (!token) return giveUp();
          operation.setContext({ [RETRIED]: true });
          sub = forward(operation).subscribe(observer);
        },
        () => {
          if (!closed) giveUp();
        },
      );

      return () => {
        closed = true;
        sub?.unsubscribe();
      };
    });
  });
}
