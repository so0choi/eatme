import { compareVersions, updateState } from './version';

describe('compareVersions', () => {
  it('같은 버전이면 0', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('패치 버전 차이를 비교한다', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
  });

  it('문자열이 아닌 숫자로 비교한다(1.10.0 > 1.9.0)', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('1.9.0', '1.10.0')).toBe(-1);
  });

  it('자릿수가 다르면 빠진 자리를 0으로 본다', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0', '1.0.1')).toBe(-1);
    expect(compareVersions('2', '1.9.9')).toBe(1);
  });

  it('숫자가 아닌 자리는 0으로 본다', () => {
    expect(compareVersions('1.0.x', '1.0.0')).toBe(0);
  });
});

describe('updateState', () => {
  const config = { minSupportedVersion: '1.2.0', latestVersion: '1.4.0' };

  it('최소 지원 버전 미만이면 force', () => {
    expect(updateState('1.1.9', config)).toBe('force');
  });

  it('최소 이상이지만 최신 미만이면 suggest', () => {
    expect(updateState('1.2.0', config)).toBe('suggest');
    expect(updateState('1.3.5', config)).toBe('suggest');
  });

  it('최신 이상이면 none', () => {
    expect(updateState('1.4.0', config)).toBe('none');
    expect(updateState('1.10.0', config)).toBe('none');
  });

  it('설정이 없으면(조회 실패) none', () => {
    expect(updateState('1.0.0', null)).toBe('none');
  });
});
