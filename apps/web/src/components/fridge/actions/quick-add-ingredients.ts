'use server';

import { z } from 'zod';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { getClient } from '@/app/ApolloClient';
import { CREATE_INGREDIENT } from '@/queries/fridge.queries';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseIngredientInput } from '../parse-ingredient-input';
import { findShelfLifeRule, getRecommendedUseBy, type StorageZone } from '../shelf-life-rules';

// 파서가 뽑은 3개 값(품목·수량·가격)만 검증. 보관/유통기한/카테고리는 추정으로 채운다.
const itemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().optional(),
  unit: z.enum(['EA', 'G', 'KG', 'ML', 'L']).optional(),
  price: z.number().nonnegative().optional(),
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
});

export type QuickAddState = {
  error?: string;
  // 저장되지 않은(검증·저장 실패) 라인. 클라가 텍스트박스를 이걸로 교체해 중복 없이 재시도한다.
  remainingRaw?: string;
} | null;

export async function quickAddIngredients(
  _: QuickAddState,
  formData: FormData,
): Promise<QuickAddState> {
  const raw = String(formData.get('raw') ?? '');
  const parsed = parseIngredientInput(raw);

  if (parsed.length === 0) {
    return { error: '입력을 인식하지 못했어요. 예) 감자 500g 3천원' };
  }

  const STORAGE_ZONES = new Set<StorageZone>(['FRIDGE', 'FREEZER', 'PANTRY']);

  // 검증 통과분(input+원문)과 실패분(원문)을 분리. (index는 클라 미리보기와 동일하게 정렬)
  const valid: { input: Record<string, unknown>; raw: string }[] = [];
  const invalidLines: string[] = [];

  parsed.forEach((p, i) => {
    const check = itemSchema.safeParse({
      name: p.name,
      quantity: p.quantity,
      unit: p.unit,
      price: p.price,
      category: String(formData.get(`category_${i}`) ?? '') || undefined,
    });
    if (!check.success) {
      invalidLines.push(p.raw);
      return;
    }
    // 보관은 사용자 override 우선, 없으면 shelf-life 추천. 유통기한은 그 보관 기준으로 자동.
    const override = String(formData.get(`storage_${i}`) ?? '') as StorageZone;
    const storage: StorageZone = STORAGE_ZONES.has(override)
      ? override
      : (findShelfLifeRule(p.name)?.recommendedStorage ?? 'FRIDGE');
    const expireAt = getRecommendedUseBy(p.name, storage)?.useBy.toISOString();
    valid.push({ input: { ...check.data, storage, expireAt }, raw: p.raw });
  });

  if (valid.length === 0) {
    return {
      error: '유효한 항목이 없어요. 형식(품목 수량 가격)을 확인해주세요.',
      remainingRaw: raw,
    };
  }

  // 개별 저장 후 부분 실패를 감지 — 성공분은 남기고 실패분만 되돌려 재시도 시 중복을 막는다.
  const results = await Promise.allSettled(
    valid.map((v) =>
      getClient().mutate<{ createIngredient: { id: number } }>({
        mutation: CREATE_INGREDIENT,
        variables: { input: v.input },
      }),
    ),
  );

  const failedLines = valid
    .filter((_, idx) => results[idx].status === 'rejected')
    .map((v) => v.raw);
  const savedCount = valid.length - failedLines.length;

  if (savedCount > 0) {
    revalidatePath('/fridge');
    revalidatePath('/dashboard');
  }

  // 미저장(검증 실패 + 저장 실패) 라인이 있으면 그것만 남기고 안내. (조용한 드롭 방지)
  const remaining = [...invalidLines, ...failedLines];
  if (remaining.length > 0) {
    const firstError = results.find((r) => r.status === 'rejected') as
      | PromiseRejectedResult
      | undefined;
    const serverMsg =
      firstError && CombinedGraphQLErrors.is(firstError.reason)
        ? firstError.reason.errors[0]?.message
        : undefined;
    return {
      error:
        savedCount > 0
          ? `${savedCount}개 저장했어요. 나머지 ${remaining.length}개는 확인이 필요해요.`
          : (serverMsg ?? '재료 저장에 실패했어요. 입력을 확인해주세요.'),
      remainingRaw: remaining.join('\n'),
    };
  }

  redirect('/fridge');
}