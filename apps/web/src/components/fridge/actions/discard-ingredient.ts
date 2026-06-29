'use server';

import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { getClient } from '@/app/ApolloClient';
import { DISCARD_INGREDIENT } from '@/queries/fridge.queries';
import { revalidatePath } from 'next/cache';

export type DiscardIngredientResult = { success: boolean; error?: string };

export async function discardIngredient(id: number): Promise<DiscardIngredientResult> {
  try {
    await getClient().mutate<{ discardIngredient: { id: number } }>({
      mutation: DISCARD_INGREDIENT,
      variables: { id },
    });
  } catch (err) {
    if (CombinedGraphQLErrors.is(err)) {
      return { success: false, error: err.errors[0]?.message ?? '폐기에 실패했습니다.' };
    }
    return { success: false, error: '폐기에 실패했습니다.' };
  }

  revalidatePath('/fridge');
  revalidatePath('/dashboard');
  return { success: true };
}
