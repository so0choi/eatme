import { Recipe } from 'gql/graphql';

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s/g, '');
}

/**
 * 냉장고 재료로 "만들 수 있는" 레시피를 추린다.
 * 필수 재료(optional=false)가 모두 냉장고에 있으면 만들 수 있는 것으로 본다.
 * 재료명은 공백 무시 + 부분 일치(양방향)로 비교한다. (예: "대파" ⊂ "다진 대파")
 */
export function getMakeableRecipes(recipes: Recipe[], ingredientNames: string[]): Recipe[] {
  const fridge = ingredientNames.map(normalize).filter(Boolean);
  if (fridge.length === 0) return [];

  return recipes.filter((recipe) => {
    const required = recipe.ingredients.filter((i) => !i.optional);
    if (required.length === 0) return false;
    return required.every((ri) => {
      const name = normalize(ri.name);
      return fridge.some((f) => f.includes(name) || name.includes(f));
    });
  });
}

/** 배열에서 무작위로 n개를 뽑는다. */
export function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
