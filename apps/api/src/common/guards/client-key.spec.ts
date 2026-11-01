import { clientKey, parseTrustProxy, positiveNumber } from './client-key';

describe('clientKey', () => {
  it('ip가 있으면 ip를 쓴다(trustProxy 시 ips가 채워져도 ip 우선)', () => {
    expect(clientKey({ ip: '1.1.1.1', ips: ['10.0.0.1', '1.1.1.1'] })).toBe(
      '1.1.1.1',
    );
  });
  it('ip가 없으면 ips[0], 둘 다 없으면 unknown', () => {
    expect(clientKey({ ips: ['2.2.2.2'] })).toBe('2.2.2.2');
    expect(clientKey({})).toBe('unknown');
  });
});

describe('parseTrustProxy', () => {
  it('기본 off, true/홉 수/목록 파싱', () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('2')).toBe(2);
    expect(parseTrustProxy('10.0.0.0/8, 172.16.0.1')).toEqual([
      '10.0.0.0/8',
      '172.16.0.1',
    ]);
  });
});

describe('positiveNumber', () => {
  it('잘못된 값은 기본값', () => {
    expect(positiveNumber('abc', 10)).toBe(10);
    expect(positiveNumber('0', 10)).toBe(10);
    expect(positiveNumber('-5', 10)).toBe(10);
    expect(positiveNumber(undefined, 10)).toBe(10);
    expect(positiveNumber('25', 10)).toBe(25);
  });
});
