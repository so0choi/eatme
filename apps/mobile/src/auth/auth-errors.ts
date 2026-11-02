import { CombinedGraphQLErrors } from '@apollo/client/errors';

// API는 HttpException 메시지에 오류 코드(예: INVALID_CREDENTIALS)를 담고,
// extensions.code에 HTTP 상태 분류(UNAUTHENTICATED, TOO_MANY_REQUESTS 등)를 담는다.
const MESSAGE_BY_CODE: Record<string, string> = {
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않아요.',
  EMAIL_IN_USE: '이미 가입된 이메일이에요.',
  ACCOUNT_EXISTS: '이미 다른 방식으로 가입된 이메일이에요.',
  INVALID_LINK_TICKET: '연동 요청이 만료됐어요. 처음부터 다시 로그인해 주세요.',
  INVALID_OAUTH_CODE: '로그인 요청이 만료됐어요. 다시 시도해 주세요.',
  INVALID_APPLE_TOKEN: 'Apple 인증을 확인하지 못했어요. 다시 시도해 주세요.',
  TOO_MANY_REQUESTS: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
};

/** 오류를 사용자 안내 문구로 바꾼다. 알 수 없는 GraphQL 오류는 fallback, 그 외(네트워크)는 연결 안내. */
export function authErrorMessage(error: unknown, fallback: string): string {
  if (CombinedGraphQLErrors.is(error)) {
    for (const e of error.errors) {
      const byMessage = MESSAGE_BY_CODE[e.message];
      if (byMessage) return byMessage;
      const code = e.extensions?.code;
      if (typeof code === 'string' && MESSAGE_BY_CODE[code]) return MESSAGE_BY_CODE[code];
    }
    return fallback;
  }
  return '네트워크 연결을 확인하고 다시 시도해 주세요.';
}

