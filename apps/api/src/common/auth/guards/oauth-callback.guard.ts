import { ExecutionContext, Injectable, Logger, Type } from '@nestjs/common';
import { AuthGuard, IAuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import {
  OAuthClient,
  OAuthStateClaims,
  OAuthStateService,
} from '../oauth-state';

/** 콜백 가드가 핸들러에 넘기는 사전 판정 결과. */
export type OAuthCallbackContext =
  | { kind: 'ok'; state: OAuthStateClaims }
  | { kind: 'error'; client: OAuthClient; error: string };

type RequestWithOAuth = FastifyRequest & {
  oauthCallback?: OAuthCallbackContext;
};

// 제공자가 돌려준 error 코드는 그대로 전달하되, 형식 밖의 값은 일반 오류로 뭉갠다.
const PROVIDER_ERROR_PATTERN = /^[a-z_]{1,64}$/;

export function getOAuthCallbackContext(
  req: FastifyRequest,
): OAuthCallbackContext | undefined {
  return (req as RequestWithOAuth).oauthCallback;
}

/**
 * OAuth 콜백 가드. passport보다 먼저 state(+nonce 쿠키)를 검증하고,
 * state 무효 / 제공자 오류(`?error=access_denied` 등) / passport 실패 시에는 예외 대신
 * 판정 결과를 req에 남기고 통과시킨다 → 핸들러가 @Redirect로 오류 리다이렉트.
 * (REST 경로 예외는 전역 필터가 GraphQL 전용이라 응답이 나가지 않아 인앱 브라우저가 멈춘다.)
 */
export function createOAuthCallbackGuard(provider: string): Type<IAuthGuard> {
  @Injectable()
  class OAuthCallbackGuard extends AuthGuard(provider) {
    private readonly logger = new Logger(`OAuthCallbackGuard(${provider})`);

    constructor(private readonly stateService: OAuthStateService) {
      super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest<RequestWithOAuth>();
      const query = (req.query ?? {}) as Record<string, unknown>;
      const state = typeof query.state === 'string' ? query.state : undefined;

      const claims = this.stateService.verifyWithCookie(
        state,
        req.headers.cookie,
      );
      if (!claims) {
        // 시작한 client를 신뢰할 수 없으므로 웹 로그인으로 보낸다.
        req.oauthCallback = {
          kind: 'error',
          client: 'web',
          error: 'invalid_state',
        };
        return true;
      }

      if (query.error !== undefined) {
        const error =
          typeof query.error === 'string' &&
          PROVIDER_ERROR_PATTERN.test(query.error)
            ? query.error
            : 'oauth';
        req.oauthCallback = { kind: 'error', client: claims.client, error };
        return true;
      }

      try {
        await super.canActivate(context);
      } catch (err) {
        this.logger.warn(
          `passport 인증 실패: ${(err as Error)?.message ?? err}`,
        );
        req.oauthCallback = {
          kind: 'error',
          client: claims.client,
          error: 'oauth',
        };
        return true;
      }
      req.oauthCallback = { kind: 'ok', state: claims };
      return true;
    }
  }
  return OAuthCallbackGuard;
}
