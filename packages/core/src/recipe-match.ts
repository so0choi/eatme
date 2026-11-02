/** 매칭에 필요한 최소 레시피 구조 (gql Recipe 등이 구조적으로 만족). */
export interface MatchableRecipe {
  ingredients: { name: string; optional?: boolean | null }[];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s/g, '');
}

/** 재료명 비교: 공백/대소문자 무시 + 부분 일치(양방향). 빈 문자열은 일치하지 않는다. */
export function namesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

export interface RecipeMatch {
  have: string[];
  missing: string[];
  haveRatio: number;
}

/** 필수(optional 아닌) 재료 기준으로 보유/부족 재료와 보유 비율을 계산한다. */
export function matchRecipe(recipe: MatchableRecipe, ingredientNames: string[]): RecipeMatch {
  const required = recipe.ingredients.filter((i) => !i.optional);
  const have: string[] = [];
  const missing: string[] = [];
  for (const ri of required) {
    (ingredientNames.some((f) => namesMatch(f, ri.name)) ? have : missing).push(ri.name);
  }
  return { have, missing, haveRatio: required.length === 0 ? 0 : have.length / required.length };
}

/** 보유 비율 내림차순, 동률이면 부족 재료가 적은 순으로 정렬한다. */
export function rankRecipes<T extends MatchableRecipe>(
  recipes: T[],
  ingredientNames: string[],
): Array<T & { match: RecipeMatch }> {
  return recipes
    .map((recipe) => ({ ...recipe, match: matchRecipe(recipe, ingredientNames) }))
    .sort((a, b) => b.match.haveRatio - a.match.haveRatio || a.match.missing.length - b.match.missing.length);
}

/**
 * 냉장고 재료로 "만들 수 있는" 레시피를 추린다.
 * 필수 재료(optional=false)가 모두 냉장고에 있으면 만들 수 있는 것으로 본다.
 * 재료명은 공백 무시 + 부분 일치(양방향)로 비교한다. (예: "대파" ⊂ "다진 대파")
 */
export function getMakeableRecipes<T extends MatchableRecipe>(recipes: T[], ingredientNames: string[]): T[] {
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
