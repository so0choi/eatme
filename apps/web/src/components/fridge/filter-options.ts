import { IngredientCategory, IngredientStatus, StorageType } from 'gql/graphql';

// 냉장고 필터 옵션·라벨의 단일 정의.
// 표 툴바 필터(FridgeTable)와 생성/수정 폼(FridgeForm)이 공유한다.

export type StorageOption = {
  key: string;
  label: string;
  storage: StorageType | null; // null = 전체
};

export type StatusOption = {
  key: string;
  label: string;
  status: IngredientStatus;
};

export type CategoryOption = {
  key: string;
  label: string;
  category: IngredientCategory | null; // null = 전체
};

// 식재료 카테고리 한글 라벨 (표 카테고리 칩 · 폼 · 필터 공용)
export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  [IngredientCategory.Meat]: '육류',
  [IngredientCategory.Seafood]: '해산물',
  [IngredientCategory.Vegetable]: '채소',
  [IngredientCategory.Fruit]: '과일',
  [IngredientCategory.Dairy]: '유제품',
  [IngredientCategory.Egg]: '달걀',
  [IngredientCategory.Grain]: '곡물',
  [IngredientCategory.Sauce]: '양념·소스',
  [IngredientCategory.Drink]: '음료',
  [IngredientCategory.Snack]: '간식',
  [IngredientCategory.Etc]: '기타',
};

// 표시 순서 (gql enum의 알파벳 순 대신 통상적인 식재료 분류 순서)
const CATEGORY_ORDER: IngredientCategory[] = [
  IngredientCategory.Meat,
  IngredientCategory.Seafood,
  IngredientCategory.Vegetable,
  IngredientCategory.Fruit,
  IngredientCategory.Dairy,
  IngredientCategory.Egg,
  IngredientCategory.Grain,
  IngredientCategory.Sauce,
  IngredientCategory.Drink,
  IngredientCategory.Snack,
  IngredientCategory.Etc,
];

export const STORAGE_OPTIONS: StorageOption[] = [
  { key: 'all', label: '전체', storage: null },
  { key: 'fridge', label: '냉장', storage: StorageType.Fridge },
  { key: 'freezer', label: '냉동', storage: StorageType.Freezer },
  { key: 'pantry', label: '실온', storage: StorageType.Pantry },
];

export const STATUS_OPTIONS: StatusOption[] = [
  { key: 'fresh', label: '신선', status: IngredientStatus.Fresh },
  { key: 'expiring', label: '만료 임박', status: IngredientStatus.ExpiringSoon },
  { key: 'expired', label: '만료됨', status: IngredientStatus.Expired },
];

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: 'all', label: '전체', category: null },
  ...CATEGORY_ORDER.map((category) => ({
    key: category.toLowerCase(),
    label: CATEGORY_LABELS[category],
    category,
  })),
];
