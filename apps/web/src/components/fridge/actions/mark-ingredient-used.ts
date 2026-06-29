'use server';

import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { getClient } from '@/app/ApolloClient';
import { UPDATE_INGREDIENT } from '@/queries/fridge.queries';
import { revalidatePath } from 'next/cache';

export type MarkUsedResult = { success: boolean; error?: string };

// 체크(사용 완료) — status를 USED로 변경한다. fridge 페이지는 USED 항목을 숨기므로 목록에서 사라진다.
export async function markIngredientUsed(id: number): Promise<MarkUsedResult> {
  try {
    await getClient().mutate({
      mutation: UPDATE_INGREDIENT,
      variables: { input: { id, status: 'USED' } },
    });
  } catch (err) {
    if (CombinedGraphQLErrors.is(err)) {
      return { success: false, error: err.errors[0]?.message ?? '처리에 실패했습니다.' };
    }
    return { success: false, error: '처리에 실패했습니다.' };
  }

  revalidatePath('/fridge');
  revalidatePath('/dashboard');
  return { success: true };
}
