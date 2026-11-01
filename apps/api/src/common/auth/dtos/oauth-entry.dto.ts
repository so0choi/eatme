import { z } from 'zod';
import { OAUTH_CLIENTS, OAuthClient } from '../oauth-state';

/** `GET /auth/{provider}?client=web|mobile` 쿼리. */
export class OAuthEntryQueryDto {
  static isZodDto = true;
  // REST 경로의 예외는 전역 필터(GraphQL 전용)가 응답을 못 보내 요청이 멈추므로,
  // 허용되지 않은/누락된 client는 거부 대신 'web'으로 취급한다.
  static schema = z.object({
    client: z.enum(OAUTH_CLIENTS).catch('web'),
  });

  client: OAuthClient;
}
