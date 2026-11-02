import {
  findShelfLifeRule,
  getCategory,
  getRecommendedUseBy,
  type ParsedIngredient,
  type StorageZone,
} from '@eatme/core';
import type { IngredientCategory, IngredientUnit } from '../api/documents';

export type CreateIngredientInput = {
  name: string;
  price?: number;
  quantity?: number;
  unit?: IngredientUnit;
  expireAt?: string;
  category?: IngredientCategory;
  storage: StorageZone;
  imageUrl?: string;
};

// 사용자가 바꾼 값. 라인 index가 아니라 라인 원문(raw)을 키로 써서 줄 추가/삭제에도 유지된다.
export type QuickAddOverrides = {
  storage?: Record<string, StorageZone>;
  category?: Record<string, IngredientCategory>;
};

export const STORAGE_ZONES: StorageZone[] = ['FRIDGE', 'FREEZER', 'PANTRY'];

export const CATEGORY_OPTIONS: { value: IngredientCategory; label: string }[] = [
  { value: 'MEAT', label: '육류' },
  { value: 'SEAFOOD', label: '해산물' },
  { value: 'VEGETABLE', label: '채소' },
  { value: 'FRUIT', label: '과일' },
  { value: 'DAIRY', label: '유제품' },
  { value: 'EGG', label: '달걀' },
  { value: 'GRAIN', label: '곡물' },
  { value: 'SAUCE', label: '양념·소스' },
  { value: 'DRINK', label: '음료' },
  { value: 'SNACK', label: '간식' },
  { value: 'ETC', label: '기타' },
];

// 품목명 기반 보관위치 자동 추정 (규칙 없으면 냉장)
export function autoStorage(name: string): StorageZone {
  return findShelfLifeRule(name)?.recommendedStorage ?? 'FRIDGE';
}

// 품목명 기반 카테고리 자동 추정 (규칙 없으면 기타)
export function autoCategory(name: string): IngredientCategory {
  return getCategory(name) ?? 'ETC';
}

export type ValidLine = { input: CreateIngredientInput; raw: string };
export type QuickAddPlan = { valid: ValidLine[]; invalidLines: string[] };

function isValid(p: ParsedIngredient): boolean {
  if (!p.name) return false;
  if (p.quantity !== undefined && !(p.quantity > 0)) return false;
  if (p.price !== undefined && !(p.price >= 0)) return false;
  return true;
}

/** 검증 통과분(입력+원문)과 실패분(원문)을 분리한다. 보관/카테고리는 override 우선, 없으면 추정값. */
export function planQuickAdd(lines: ParsedIngredient[], overrides: QuickAddOverrides = {}): QuickAddPlan {
  const valid: ValidLine[] = [];
  const invalidLines: string[] = [];
  for (const p of lines) {
    if (!isValid(p)) {
      invalidLines.push(p.raw);
      continue;
    }
    const storage = overrides.storage?.[p.raw] ?? autoStorage(p.name);
    const category = overrides.category?.[p.raw] ?? autoCategory(p.name);
    const expireAt = getRecommendedUseBy(p.name, storage)?.useBy.toISOString();
    const input: CreateIngredientInput = { name: p.name, storage, category };
    if (p.quantity !== undefined) input.quantity = p.quantity;
    if (p.unit !== undefined) input.unit = p.unit;
    if (p.price !== undefined) input.price = p.price;
    if (expireAt) input.expireAt = expireAt;
    valid.push({ input, raw: p.raw });
  }
  return { valid, invalidLines };
}

export function buildCreateInputs(lines: ParsedIngredient[], overrides: QuickAddOverrides = {}): CreateIngredientInput[] {
  return planQuickAdd(lines, overrides).valid.map((v) => v.input);
}

/** 저장 결과(allSettled)에서 미저장 라인(검증 실패 + 저장 실패)만 남긴다. 재시도 시 중복 저장을 막는다. */
export function summarizeSave(
  plan: QuickAddPlan,
  results: PromiseSettledResult<unknown>[],
): { savedCount: number; remainingLines: string[]; firstError: unknown } {
  const failed = plan.valid.filter((_, i) => results[i]?.status === 'rejected');
  const firstRejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  return {
    savedCount: plan.valid.length - failed.length,
    remainingLines: [...plan.invalidLines, ...failed.map((v) => v.raw)],
    firstError: firstRejected?.reason,
  };
}
