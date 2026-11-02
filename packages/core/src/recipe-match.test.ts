import { describe, expect, it } from 'vitest';
import { matchRecipe, namesMatch, rankRecipes } from './recipe-match';

const r = (id: string, names: string[], optional: string[] = []) => ({
  id,
  ingredients: [...names.map((name) => ({ name })), ...optional.map((name) => ({ name, optional: true }))],
});

describe('matchRecipe', () => {
  it('필수 재료 기준으로 보유/부족/비율을 계산한다', () => {
    const recipe = r('a', ['감자', '양파'], ['후추']);
    expect(matchRecipe(recipe, ['감자 500g'])).toEqual({ have: ['감자'], missing: ['양파'], haveRatio: 0.5 });
  });
  it('필수 재료가 없으면 비율 0', () => {
    expect(matchRecipe(r('b', [], ['후추']), ['후추'])).toEqual({ have: [], missing: [], haveRatio: 0 });
  });
});

describe('rankRecipes', () => {
  it('비율 내림차순, 동률이면 부족 재료가 적은 순', () => {
    const full = r('full', ['감자']);
    const half = r('half', ['감자', '양파']);
    const halfBig = r('halfBig', ['감자', '양파', '당근', '대파']);
    const none = r('none', ['두부']);
    const ranked = rankRecipes([none, halfBig, half, full], ['감자', '당근']);
    expect(ranked.map((x) => x.id)).toEqual(['full', 'half', 'halfBig', 'none']);
    expect(ranked[0].match.haveRatio).toBe(1);
  });
});

describe('namesMatch', () => {
  it('공백·대소문자 무시, 양방향 부분 일치', () => {
    expect(namesMatch('다진 대파', '대파')).toBe(true);
    expect(namesMatch('대파', '다진 대파')).toBe(true);
    expect(namesMatch('Egg', 'egg')).toBe(true);
  });
  it('다르거나 빈 이름은 불일치', () => {
    expect(namesMatch('감자', '양파')).toBe(false);
    expect(namesMatch('', '감자')).toBe(false);
    expect(namesMatch('  ', '  ')).toBe(false);
  });
});
