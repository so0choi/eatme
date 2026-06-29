'use server';

import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { getClient } from '@/app/ApolloClient';
import { DELETE_INGREDIENT } from '@/queries/fridge.queries';
import { revalidatePath } from 'next/cache';

export type DeleteIngredientResult = { success: boolean; error?: string };

export async function deleteIngredient(id: number): Promise<DeleteIngredientResult> {
  try {
    await getClient().mutate<{ deleteIngredient: boolean }>({
      mutation: DELETE_INGREDIENT,
      variables: { id },
    });
  } catch (err) {
    if (CombinedGraphQLErrors.is(err)) {
      return { success: false, error: err.errors[0]?.message ?? '삭제에 실패했습니다.' };
    }
    return { success: false, error: '삭제에 실패했습니다.' };
  }

  revalidatePath('/fridge');
  revalidatePath('/dashboard');
  return { success: true };
}
