import { daysLeft, isExpiringSoon, type StorageZone } from '@eatme/core';
import type { Ingredient } from '../api/documents';

export type GroupedIngredients = {
  expiringSoon: Ingredient[];
  byStorage: Record<StorageZone, Ingredient[]>;
};

// 유통기한 없는 재료는 가장 뒤로 보낸다.
const byExpiry = (a: Ingredient, b: Ingredient, now: Date) =>
  (a.expireAt ? daysLeft(a.expireAt, now) : Infinity) - (b.expireAt ? daysLeft(b.expireAt, now) : Infinity);

/**
 * 냉장고 목록 분류. USED/DISCARDED는 제외한다.
 * 임박(오늘~3일) 재료는 daysLeft 오름차순 섹션으로 뽑고, 전체 재료는 보관 위치별로도 보여 준다.
 * 이미 지난(EXPIRED) 재료는 임박 섹션이 아니라 보관 위치 목록 맨 앞에 둔다.
 */
export function groupIngredients(items: Ingredient[], now: Date = new Date()): GroupedIngredients {
  const active = items.filter((i) => i.status !== 'USED' && i.status !== 'DISCARDED');
  const expiringSoon = active
    .filter((i) => i.expireAt != null && isExpiringSoon(i.expireAt, now))
    .sort((a, b) => byExpiry(a, b, now));
  const byStorage: Record<StorageZone, Ingredient[]> = { FRIDGE: [], FREEZER: [], PANTRY: [] };
  for (const item of [...active].sort((a, b) => byExpiry(a, b, now))) {
    byStorage[item.storage].push(item);
  }
  return { expiringSoon, byStorage };
}
