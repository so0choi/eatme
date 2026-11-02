import { describe, expect, it } from 'vitest';
import { forwardedFor } from './forwarded-for';

describe('forwardedFor', () => {
  it('신뢰 설정이 꺼져 있으면 아무것도 전달하지 않는다', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7', 'x-real-ip': '198.51.100.4' });
    expect(forwardedFor(headers, false)).toBeUndefined();
  });

  it('체인 전체가 아니라 앞단 ingress가 붙인 맨 오른쪽 IP만 전달한다', () => {
    // 왼쪽 값은 클라이언트가 위조할 수 있다. ingress가 append한 마지막 값만 믿는다.
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 203.0.113.7' });
    expect(forwardedFor(headers, true)).toBe('203.0.113.7');
  });

  it('x-forwarded-for가 없으면 x-real-ip를 쓴다', () => {
    const headers = new Headers({ 'x-real-ip': ' 198.51.100.4 ' });
    expect(forwardedFor(headers, true)).toBe('198.51.100.4');
  });

  it('값이 없거나 비어 있으면 undefined', () => {
    expect(forwardedFor(new Headers(), true)).toBeUndefined();
    expect(forwardedFor(new Headers({ 'x-forwarded-for': ' , ' }), true)).toBeUndefined();
  });
});
