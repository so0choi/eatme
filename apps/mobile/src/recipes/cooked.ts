import { matchRecipe, namesMatch, type MatchableRecipe } from '@eatme/core';
import type { Ingredient } from '../api/documents';

/** 냉장고에 남아 있는(사용/폐기되지 않은) 재료. */
export function activeIngredients(ingredients: Ingredient[]): Ingredient[] {
  return ingredients.filter((i) => i.status !== 'USED' && i.status !== 'DISCARDED');
}

const expiryKey = (i: Ingredient) => (i.expireAt ? new Date(i.expireAt).getTime() : Number.POSITIVE_INFINITY);

/**
 * "요리했어요" 대상: 레시피의 보유(have) 재료마다 이름이 매칭되는 냉장고 재료를 유통기한이 가장 빠른 것 1개씩 고른다.
 * 기한 없는 재료는 마지막, 한 냉장고 재료는 한 번만 선택된다.
 */
export function pickIngredientsToUse(recipe: MatchableRecipe, ingredients: Ingredient[]): Ingredient[] {
  const active = activeIngredients(ingredients);
  const { have } = matchRecipe(recipe, active.map((i) => i.name));
  const picked: Ingredient[] = [];
  for (const name of have) {
    const candidate = active
      .filter((i) => !picked.includes(i) && namesMatch(i.name, name))
      .sort((a, b) => expiryKey(a) - expiryKey(b))[0];
    if (candidate) picked.push(candidate);
  }
  return picked;
}
