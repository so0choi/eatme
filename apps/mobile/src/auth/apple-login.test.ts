import { formatAppleName } from './apple-login';

jest.mock('../api/client', () => ({ apolloClient: {} }));

describe('formatAppleName', () => {
  it('이름과 성을 공백으로 잇는다', () => {
    expect(formatAppleName({ givenName: '길동', familyName: '홍' })).toBe('길동 홍');
  });

  it('한쪽만 있으면 그 값만', () => {
    expect(formatAppleName({ givenName: ' 길동 ', familyName: null })).toBe('길동');
    expect(formatAppleName({ familyName: '홍' })).toBe('홍');
  });

  it('이름 정보가 없으면 null(재로그인 시 Apple이 이름을 주지 않음)', () => {
    expect(formatAppleName(null)).toBeNull();
    expect(formatAppleName({ givenName: '', familyName: '  ' })).toBeNull();
  });
});
