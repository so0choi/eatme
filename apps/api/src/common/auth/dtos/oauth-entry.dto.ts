import { z } from 'zod';
import {
  MOBILE_PLATFORMS,
  MobilePlatform,
  OAUTH_CLIENTS,
  OAuthClient,
  PKCE_CHALLENGE_PATTERN,
} from '../oauth-state';

/** `GET /auth/{provider}?client=web|mobile&code_challenge=<S256>&platform=ios|android` 쿼리. */
export class OAuthEntryQueryDto {
  static isZodDto = true;
  // REST 경로의 예외는 전역 필터(GraphQL 전용)가 응답을 못 보내 요청이 멈추므로,
  // 형식이 잘못된 값은 거부 대신 기본값으로 취급한다(client → 'web', code_challenge·platform → 없음).
  static schema = z.object({
    client: z.enum(OAUTH_CLIENTS).catch('web'),
    code_challenge: z
      .string()
      .regex(PKCE_CHALLENGE_PATTERN)
      .optional()
      .catch(undefined),
    platform: z.enum(MOBILE_PLATFORMS).optional().catch(undefined),
  });

  client: OAuthClient;
  /** PKCE S256 challenge(base64url). client=mobile이면 필수. */
  code_challenge?: string;
  /** 앱 기기 플랫폼(client=mobile일 때만 의미). 세션 platform으로 저장된다. */
  platform?: MobilePlatform;
}
