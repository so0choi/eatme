import type { RecipeDifficulty } from '../api/documents';

export const DIFFICULTY_LABEL: Record<RecipeDifficulty, string> = {
  EASY: '쉬움',
  MEDIUM: '보통',
  HARD: '어려움',
};

export function formatCookTime(minutes?: number | null): string {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

export function formatRecipeAmount(quantity: number | null, unit: string | null): string {
  if (quantity == null) return unit ?? '적당량';
  return `${quantity}${unit ?? ''}`;
}
