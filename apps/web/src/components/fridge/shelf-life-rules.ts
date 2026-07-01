export type StorageZone = 'FRIDGE' | 'FREEZER' | 'PANTRY';

export type ShelfLifeRule = {
  id: string;
  label: string;
  aliases: string[];
  storageDays: Partial<Record<StorageZone, number>>;
  recommendedStorage: StorageZone;
};

export const storageLabels: Record<StorageZone, string> = {
  FRIDGE: '냉장',
  FREEZER: '냉동',
  PANTRY: '실온',
};

export const shelfLifeRules: ShelfLifeRule[] = [
  {
    id: 'egg',
    label: '계란',
    aliases: ['계란', '달걀', 'egg'],
    storageDays: { FRIDGE: 21 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'milk',
    label: '우유',
    aliases: ['우유', 'milk'],
    storageDays: { FRIDGE: 5 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'tofu',
    label: '두부',
    aliases: ['두부', 'tofu'],
    storageDays: { FRIDGE: 3, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'green-onion',
    label: '대파',
    aliases: ['대파', '쪽파'],
    storageDays: { FRIDGE: 7, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'leafy-greens',
    label: '상추/깻잎',
    aliases: ['상추', '깻잎', '쌈채소'],
    storageDays: { FRIDGE: 3 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'onion',
    label: '양파',
    aliases: ['양파', 'onion'],
    storageDays: { PANTRY: 14, FRIDGE: 10 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'potato',
    label: '감자',
    aliases: ['감자', 'potato'],
    storageDays: { PANTRY: 14 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'carrot',
    label: '당근',
    aliases: ['당근', 'carrot'],
    storageDays: { FRIDGE: 14, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'mushroom',
    label: '버섯',
    aliases: ['버섯', '표고', '새송이', '양송이', 'mushroom'],
    storageDays: { FRIDGE: 5, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'apple',
    label: '사과',
    aliases: ['사과', 'apple'],
    storageDays: { PANTRY: 7, FRIDGE: 21 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'banana',
    label: '바나나',
    aliases: ['바나나', 'banana'],
    storageDays: { PANTRY: 3, FREEZER: 30 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'chicken',
    label: '닭고기',
    aliases: ['닭고기', '닭가슴살', '닭다리', 'chicken'],
    storageDays: { FRIDGE: 2, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'pork',
    label: '돼지고기',
    aliases: ['돼지고기', '삼겹살', '목살', 'pork'],
    storageDays: { FRIDGE: 3, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'beef',
    label: '소고기',
    aliases: ['소고기', '쇠고기', 'beef'],
    storageDays: { FRIDGE: 3, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'fish',
    label: '생선',
    aliases: ['생선', '고등어', '갈치', '연어', 'fish'],
    storageDays: { FRIDGE: 1, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'cooked-food',
    label: '밥/반찬/조리음식',
    aliases: ['밥', '반찬', '조리음식', '볶음밥', '국', '찌개'],
    storageDays: { FRIDGE: 3, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/\s/g, '');
}

export function findShelfLifeRule(name: string) {
  const normalizedName = normalize(name);
  if (!normalizedName) return null;

  return (
    shelfLifeRules.find((rule) =>
      rule.aliases.some((alias) => normalizedName.includes(normalize(alias))),
    ) ?? null
  );
}

export function getShelfLifeDays(name: string, storage: StorageZone) {
  const rule = findShelfLifeRule(name);
  if (!rule) return null;
  const days = rule.storageDays[storage];
  if (!days) return null;
  return { rule, days };
}

export function addDaysFromToday(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

export function getRecommendedUseBy(name: string, storage: StorageZone) {
  const shelfLife = getShelfLifeDays(name, storage);
  if (!shelfLife) return null;
  return {
    ...shelfLife,
    useBy: addDaysFromToday(shelfLife.days),
  };
}
