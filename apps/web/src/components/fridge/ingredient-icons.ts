import { IngredientCategory } from 'gql/graphql';

export const ingredientEmojiMap: Record<IngredientCategory, string> = {
  [IngredientCategory.Egg]: '🥚',
  [IngredientCategory.Dairy]: '🥛',
  [IngredientCategory.Vegetable]: '🧅',
  [IngredientCategory.Fruit]: '🍎',
  [IngredientCategory.Meat]: '🥩',
  [IngredientCategory.Seafood]: '🐟',
  [IngredientCategory.Grain]: '🍚',
  [IngredientCategory.Sauce]: '🧂',
  [IngredientCategory.Drink]: '🥤',
  [IngredientCategory.Snack]: '🍪',
  [IngredientCategory.Etc]: '🥣',
};

export function getIngredientEmoji(category?: IngredientCategory | null): string {
  return category ? ingredientEmojiMap[category] : ingredientEmojiMap[IngredientCategory.Etc];
}
