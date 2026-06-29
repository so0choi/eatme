import { IngredientUnit, RecipeDifficulty } from 'gql/graphql';

const unitLabels: Record<IngredientUnit, string> = {
  [IngredientUnit.Bottle]: '병',
  [IngredientUnit.Ea]: '개',
  [IngredientUnit.G]: 'g',
  [IngredientUnit.Kg]: 'kg',
  [IngredientUnit.L]: 'L',
  [IngredientUnit.Ml]: 'ml',
  [IngredientUnit.Pack]: '팩',
};

export function formatAmount(
  quantity?: number | null,
  unit?: IngredientUnit | null,
): string {
  if (quantity == null) return unit ? unitLabels[unit] : '적당량';
  return `${quantity}${unit ? unitLabels[unit] : ''}`;
}

export const difficultyMeta: Record<
  RecipeDifficulty,
  { label: string; badge: string; dot: string }
> = {
  [RecipeDifficulty.Easy]: {
    label: '쉬움',
    badge: 'bg-primary-container/20 text-on-primary-container',
    dot: 'bg-primary',
  },
  [RecipeDifficulty.Medium]: {
    label: '보통',
    badge: 'bg-secondary-fixed text-on-secondary-fixed',
    dot: 'bg-org',
  },
  [RecipeDifficulty.Hard]: {
    label: '어려움',
    badge: 'bg-tertiary-container/25 text-tertiary',
    dot: 'bg-tertiary',
  },
};

export function formatCookTime(minutes?: number | null): string {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}
