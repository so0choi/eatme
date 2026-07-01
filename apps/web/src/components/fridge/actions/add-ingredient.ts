'use server';

import { z } from 'zod';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { getClient } from '@/app/ApolloClient';
import { CREATE_INGREDIENT } from '@/queries/fridge.queries';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getRecommendedUseBy, type StorageZone } from '../shelf-life-rules';

function isTodayOrFuture(value: string) {
  const selected = new Date(value);
  if (Number.isNaN(selected.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  selected.setHours(0, 0, 0, 0);
  return selected >= today;
}

const schema = z.object({
  name: z.string().min(1, '재료명을 입력해주세요.'),
  storage: z.enum(['FRIDGE', 'FREEZER', 'PANTRY'], '보관 위치를 선택해주세요.'),
  quantity: z.coerce
    .number('수량은 숫자여야 합니다.')
    .positive('수량은 0보다 커야 합니다.')
    .optional(),
  unit: z.enum(['EA', 'G', 'KG', 'ML', 'L']).optional(),
  expireAt: z
    .string()
    .refine(isTodayOrFuture, '이미 지난 날짜는 선택할 수 없습니다.')
    .optional(),
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

export type AddIngredientState = {
  error?: Record<string, string[]>;
  success?: boolean;
} | null;

export async function addIngredient(_: AddIngredientState, formData: FormData) {
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
    const input = { ...validated.data };
    if (!input.expireAt) {
      const recommendation = getRecommendedUseBy(input.name, input.storage as StorageZone);
      input.expireAt = recommendation?.useBy.toISOString();
    }

    await getClient().mutate<{ createIngredient: { id: number } }>({
      mutation: CREATE_INGREDIENT,
      variables: { input },
    });
  } catch (err) {
    if (CombinedGraphQLErrors.is(err)) {
      const message = err.errors[0]?.message ?? '재료 추가에 실패했습니다.';
      return { error: { _form: [message] } };
    }
    return { error: { _form: ['재료 추가에 실패했습니다.'] } };
  }

  revalidatePath('/fridge');
  revalidatePath('/dashboard');
  redirect('/fridge');
}
