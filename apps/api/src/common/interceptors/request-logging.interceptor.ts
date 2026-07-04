import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name, {
    timestamp: true,
  });

  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    // REST(http)와 GraphQL은 컨텍스트 추출 방식이 다르다.
    // GraphQL 전용으로 컨텍스트를 읽으면 REST 요청에서 undefined 구조분해로 터진다.
    const { req, reply } =
      context.getType() === 'http'
        ? {
            req: context.switchToHttp().getRequest(),
            reply: context.switchToHttp().getResponse(),
          }
        : (GqlExecutionContext.create(context).getContext() ?? {});

    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const statusCode = reply?.statusCode;
        if (!statusCode) return;
        // Fastify 요청은 originalUrl이 없으므로 url로 폴백.
        const url = req?.originalUrl ?? req?.url;
        this.logger.log(
          `${req?.method} ${url} - ${statusCode} (${Date.now() - now}ms)`,
        );
      }),
    );
  }
}
