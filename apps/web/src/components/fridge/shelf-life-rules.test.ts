import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findShelfLifeRule, getCategory, getRecommendedUseBy, getShelfLifeDays } from './shelf-life-rules';

describe('findShelfLifeRule', () => {
  it('별칭·부분일치·대소문자·공백을 무시하고 찾는다', () => {
    expect(findShelfLifeRule('달걀')?.id).toBe('egg');
    expect(findShelfLifeRule('유기농 계란 30구')?.id).toBe('egg');
    expect(findShelfLifeRule('Milk')?.id).toBe('milk');
    expect(findShelfLifeRule('서울 우유')?.id).toBe('milk');
  });

  it('매칭이 없거나 빈 이름이면 null', () => {
    expect(findShelfLifeRule('키친타올')).toBeNull();
    expect(findShelfLifeRule('  ')).toBeNull();
  });
});

describe('getShelfLifeDays', () => {
  it('보관 위치별 일수를 돌려준다', () => {
    expect(getShelfLifeDays('두부', 'FRIDGE')?.days).toBe(3);
    expect(getShelfLifeDays('두부', 'FREEZER')?.days).toBe(30);
  });

  it('해당 보관 위치 규칙이 없으면 null', () => {
    expect(getShelfLifeDays('우유', 'PANTRY')).toBeNull();
  });
});

describe('getRecommendedUseBy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 2, 15, 30));
  });
  afterEach(() => vi.useRealTimers());

  it('오늘 0시 기준으로 일수를 더한다', () => {
    expect(getRecommendedUseBy('우유', 'FRIDGE')?.useBy).toEqual(new Date(2026, 10, 7));
  });
});

describe('getCategory', () => {
  it('규칙 id로 카테고리를 추정한다', () => {
    expect(getCategory('계란')).toBe('EGG');
    expect(getCategory('우유')).toBe('DAIRY');
    expect(getCategory('키친타올')).toBeNull();
  });
});
