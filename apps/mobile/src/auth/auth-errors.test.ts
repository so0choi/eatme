import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { authErrorMessage } from './auth-errors';

const gqlError = (message: string, code?: string) =>
  new CombinedGraphQLErrors({ errors: [{ message, extensions: code ? { code } : undefined }] });

describe('authErrorMessage', () => {
  it('메시지의 오류 코드를 안내 문구로 바꾼다', () => {
    expect(authErrorMessage(gqlError('INVALID_CREDENTIALS', 'UNAUTHENTICATED'), 'x')).toBe(
      '이메일 또는 비밀번호가 올바르지 않아요.',
    );
    expect(authErrorMessage(gqlError('ACCOUNT_EXISTS', 'UNAUTHENTICATED'), 'x')).toBe(
      '이미 다른 방식으로 가입된 이메일이에요.',
    );
  });

  it('extensions.code로도 매핑한다(요청 제한)', () => {
    expect(authErrorMessage(gqlError('ThrottlerException', 'TOO_MANY_REQUESTS'), 'x')).toContain('잠시 후');
  });

  it('알 수 없는 GraphQL 오류는 fallback, 네트워크 오류는 연결 안내', () => {
    expect(authErrorMessage(gqlError('SOMETHING'), '실패했어요')).toBe('실패했어요');
    expect(authErrorMessage(new TypeError('Network request failed'), '실패했어요')).toContain('네트워크');
  });
});
