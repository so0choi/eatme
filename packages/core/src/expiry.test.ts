import { describe, expect, it } from 'vitest';
import { daysLeft, isExpiringSoon } from './expiry';

describe('daysLeft (KST 달력 기준)', () => {
  it('KST 날짜 차이로 계산한다', () => {
    expect(daysLeft(new Date('2026-11-03T15:30:00Z'), new Date('2026-11-03T00:00:00Z'))).toBe(1);
  });
  it('같은 KST 날짜면 0, 문자열도 받는다', () => {
    expect(daysLeft('2026-11-02T20:00:00Z', new Date('2026-11-03T01:00:00Z'))).toBe(0);
  });
  it('지난 날짜는 음수', () => {
    expect(daysLeft('2026-11-02T10:00:00Z', new Date('2026-11-03T01:00:00Z'))).toBe(-1);
  });
});

describe('isExpiringSoon', () => {
  const now = new Date('2026-11-03T01:00:00Z');
  it('0~3일 남았으면 true', () => {
    expect(isExpiringSoon('2026-11-03T01:00:00Z', now)).toBe(true);
    expect(isExpiringSoon('2026-11-06T01:00:00Z', now)).toBe(true);
  });
  it('4일 이상 또는 이미 지났으면 false', () => {
    expect(isExpiringSoon('2026-11-07T01:00:00Z', now)).toBe(false);
    expect(isExpiringSoon('2026-11-02T01:00:00Z', now)).toBe(false);
  });
});
