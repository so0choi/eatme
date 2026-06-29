import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { GqlExceptionFilter, GqlArgumentsHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class ExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    GqlArgumentsHost.create(host);

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const codeMap: Record<number, string> = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHENTICATED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
      };
      return new GraphQLError(exception.message, {
        extensions: { code: codeMap[status] ?? 'BAD_USER_INPUT', status },
      });
    }

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';
    return new GraphQLError(message, {
      extensions: { code: 'INTERNAL_ERROR', status: 500 },
    });
  }
}
