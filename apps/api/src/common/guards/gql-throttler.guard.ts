import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * GraphQL 컨텍스트용 ThrottlerGuard. 전역이 아니라 인증 mutation에만 `@UseGuards`로 건다.
 * 컨텍스트는 Fastify req를 spread한 객체라 `ctx.req`(Fastify request)에서 IP를 읽는다.
 * Fastify reply는 GraphQL 컨텍스트에 없으므로, 헤더 설정은 모듈 옵션 `setHeaders: false`로 끄고
 * 방어적으로 no-op 응답 stub을 돌려준다.
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context).getContext();
    const res = ctx.res ?? { header: () => res };
    return { req: ctx.req, res };
  }

  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(req.ip ?? req.ips?.[0] ?? 'unknown');
  }
}
