import { describe, expect, it } from 'vitest';
import { forwardedFor } from './forwarded-for';

describe('forwardedFor', () => {
  it('들어온 x-forwarded-for 체인을 정규화해 그대로 넘긴다', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7 ,10.0.0.2' });
    expect(forwardedFor(headers)).toBe('203.0.113.7, 10.0.0.2');
  });

  it('x-forwarded-for가 없으면 x-real-ip를 쓴다', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.4' });
    expect(forwardedFor(headers)).toBe('198.51.100.4');
  });

  it('IP 정보가 없으면 undefined', () => {
    expect(forwardedFor(new Headers())).toBeUndefined();
    expect(forwardedFor(new Headers({ 'x-forwarded-for': ' , ' }))).toBeUndefined();
  });
});
