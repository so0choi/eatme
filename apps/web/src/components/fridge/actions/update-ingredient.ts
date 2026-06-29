'use server';

import { z } from 'zod';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { getClient } from '@/app/ApolloClient';
import { UPDATE_INGREDIENT } from '@/queries/fridge.queries';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { AddIngredientState } from './add-ingredient';

const schema = z.object({
  name: z.string().min(1, '재료명을 입력해주세요.'),
  storage: z.enum(['FRIDGE', 'FREEZER', 'PANTRY'], '보관 위치를 선택해주세요.'),
  quantity: z.coerce
    .number('수량은 숫자여야 합니다.')
    .positive('수량은 0보다 커야 합니다.')
    .optional(),
  unit: z.enum(['EA', 'G', 'KG', 'ML', 'L']).optional(),
  expireAt: z.string().optional(),
  category: z
    .enum([
      'MEAT',
      'SEAFOOD',
      'VEGETABLE',
      'FRUIT',
      'DAIRY',
      'EGG',
      'GRAIN',
      'SAUCE',
      'DRINK',
      'SNACK',
      'ETC',
    ])
    .optional(),
  price: z.coerce
    .number()
    .nonnegative('가격은 0 이상이어야 합니다.')
    .optional(),
});

export async function updateIngredient(
  id: number,
  _: AddIngredientState,
  formData: FormData,
): Promise<AddIngredientState> {
  const raw = {
    name: formData.get('name'),
    storage: formData.get('storage'),
    quantity: formData.get('quantity') || undefined,
    unit: formData.get('unit') || undefined,
    expireAt: formData.get('expireAt') || undefined,
    category: formData.get('category') || undefined,
    price: formData.get('price') || undefined,
  };

  const validated = schema.safeParse(raw);

  if (!validated.success) {
    return {
      error: z.flattenError(validated.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    await getClient().mutate<{ updateIngredient: { id: number } }>({
      mutation: UPDATE_INGREDIENT,
      variables: { input: { id, ...validated.data } },
    });
  } catch (err) {
    if (CombinedGraphQLErrors.is(err)) {
      const message = err.errors[0]?.message ?? '재료 수정에 실패했습니다.';
      return { error: { _form: [message] } };
    }
    return { error: { _form: ['재료 수정에 실패했습니다.'] } };
  }

  revalidatePath('/fridge');
  revalidatePath('/dashboard');
  revalidatePath(`/fridge/${id}/edit`);
  redirect('/fridge');
}
