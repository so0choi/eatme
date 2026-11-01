import { z } from 'zod';
import {
  OAUTH_CLIENTS,
  OAuthClient,
  PKCE_CHALLENGE_PATTERN,
} from '../oauth-state';

/** `GET /auth/{provider}?client=web|mobile&code_challenge=<S256>` 쿼리. */
export class OAuthEntryQueryDto {
  static isZodDto = true;
  // REST 경로의 예외는 전역 필터(GraphQL 전용)가 응답을 못 보내 요청이 멈추므로,
  // 형식이 잘못된 값은 거부 대신 기본값으로 취급한다(client → 'web', code_challenge → 없음).
  static schema = z.object({
    client: z.enum(OAUTH_CLIENTS).catch('web'),
    code_challenge: z
      .string()
      .regex(PKCE_CHALLENGE_PATTERN)
      .optional()
      .catch(undefined),
  });

  client: OAuthClient;
  /** PKCE S256 challenge(base64url). client=mobile이면 필수. */
  code_challenge?: string;
}
