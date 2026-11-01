import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findShelfLifeRule,
  getCategory,
  getRecommendedUseBy,
  getShelfLifeDays,
  RULE_CATEGORY,
  shelfLifeRules,
} from './shelf-life-rules';

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

describe('shelfLifeRules 확장', () => {
  it('규칙이 80개 이상이다', () => {
    expect(shelfLifeRules.length).toBeGreaterThanOrEqual(80);
  });

  it('모든 규칙 id가 RULE_CATEGORY에 있고 id가 중복되지 않는다', () => {
    for (const rule of shelfLifeRules) expect(RULE_CATEGORY[rule.id], rule.id).toBeDefined();
    const ids = shelfLifeRules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('별칭이 규칙 간에 중복되지 않는다', () => {
    const aliases = shelfLifeRules.flatMap((r) => r.aliases.map((a) => a.toLowerCase().replace(/\s/g, '')));
    expect(new Set(aliases).size).toBe(aliases.length);
  });

  it('새 규칙 샘플을 찾는다', () => {
    expect(findShelfLifeRule('냉동만두')?.id).toBe('dumpling');
    expect(findShelfLifeRule('양배추 1통')?.id).toBe('cabbage');
    expect(findShelfLifeRule('청양고추')?.id).toBe('pepper');
    expect(findShelfLifeRule('국산 고추장')?.id).toBe('gochujang');
    expect(findShelfLifeRule('쌀국수')?.id).toBe('noodles');
    expect(findShelfLifeRule('단호박')?.id).toBe('sweet-pumpkin');
    expect(getCategory('요거트')).toBe('DAIRY');
  });
});
