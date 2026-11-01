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
    id: 'spinach',
    label: '시금치',
    aliases: ['시금치'],
    storageDays: { FRIDGE: 4 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'cabbage',
    label: '양배추',
    aliases: ['양배추'],
    storageDays: { FRIDGE: 14 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'napa-cabbage',
    label: '배추',
    aliases: ['배추'],
    storageDays: { FRIDGE: 7 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'cucumber',
    label: '오이',
    aliases: ['오이'],
    storageDays: { FRIDGE: 5 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'sweet-pumpkin',
    label: '단호박',
    aliases: ['단호박'],
    storageDays: { PANTRY: 30, FRIDGE: 14 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'zucchini',
    label: '애호박',
    aliases: ['애호박', '호박'],
    storageDays: { FRIDGE: 7 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'gochujang',
    label: '고추장',
    aliases: ['고추장'],
    storageDays: { FRIDGE: 180, PANTRY: 90 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'pepper',
    label: '고추',
    aliases: ['고추', '청양'],
    storageDays: { FRIDGE: 7, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'bell-pepper',
    label: '파프리카/피망',
    aliases: ['파프리카', '피망'],
    storageDays: { FRIDGE: 7 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'garlic',
    label: '마늘',
    aliases: ['마늘'],
    storageDays: { PANTRY: 30, FRIDGE: 30, FREEZER: 60 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'ginger',
    label: '생강',
    aliases: ['생강'],
    storageDays: { FRIDGE: 21, FREEZER: 60 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'broccoli',
    label: '브로콜리',
    aliases: ['브로콜리'],
    storageDays: { FRIDGE: 5, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'tomato',
    label: '토마토',
    aliases: ['토마토'],
    storageDays: { FRIDGE: 7, PANTRY: 5 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'sweet-potato',
    label: '고구마',
    aliases: ['고구마'],
    storageDays: { PANTRY: 21 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'bean-sprout',
    label: '콩나물/숙주',
    aliases: ['콩나물', '숙주'],
    storageDays: { FRIDGE: 3 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'corn',
    label: '옥수수',
    aliases: ['옥수수'],
    storageDays: { FRIDGE: 3, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'chive',
    label: '부추',
    aliases: ['부추'],
    storageDays: { FRIDGE: 3 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'water-parsley',
    label: '미나리',
    aliases: ['미나리'],
    storageDays: { FRIDGE: 4 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'celery',
    label: '셀러리',
    aliases: ['셀러리', '샐러리'],
    storageDays: { FRIDGE: 7 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'asparagus',
    label: '아스파라거스',
    aliases: ['아스파라거스'],
    storageDays: { FRIDGE: 4 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'cauliflower',
    label: '콜리플라워',
    aliases: ['콜리플라워'],
    storageDays: { FRIDGE: 7 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'salad',
    label: '샐러드',
    aliases: ['샐러드'],
    storageDays: { FRIDGE: 3 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'orange',
    label: '오렌지/귤',
    aliases: ['오렌지', '귤'],
    storageDays: { PANTRY: 7, FRIDGE: 14 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'strawberry',
    label: '딸기',
    aliases: ['딸기'],
    storageDays: { FRIDGE: 3, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'grape',
    label: '포도',
    aliases: ['포도'],
    storageDays: { FRIDGE: 5 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'watermelon',
    label: '수박',
    aliases: ['수박'],
    storageDays: { FRIDGE: 5 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'kiwi',
    label: '키위',
    aliases: ['키위'],
    storageDays: { FRIDGE: 7, PANTRY: 4 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'lemon',
    label: '레몬',
    aliases: ['레몬'],
    storageDays: { FRIDGE: 14, PANTRY: 7 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'blueberry',
    label: '블루베리',
    aliases: ['블루베리'],
    storageDays: { FRIDGE: 5, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'peach',
    label: '복숭아',
    aliases: ['복숭아'],
    storageDays: { FRIDGE: 3, PANTRY: 2 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'avocado',
    label: '아보카도',
    aliases: ['아보카도'],
    storageDays: { FRIDGE: 5, PANTRY: 3 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'pineapple',
    label: '파인애플',
    aliases: ['파인애플'],
    storageDays: { FRIDGE: 5, PANTRY: 3 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'mango',
    label: '망고',
    aliases: ['망고'],
    storageDays: { FRIDGE: 5, PANTRY: 3 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'melon',
    label: '멜론/참외',
    aliases: ['멜론', '참외'],
    storageDays: { FRIDGE: 5 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'ground-meat',
    label: '다진 고기',
    aliases: ['다짐육', '간고기', '민찌'],
    storageDays: { FRIDGE: 1, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'duck',
    label: '오리고기',
    aliases: ['오리고기', '훈제오리'],
    storageDays: { FRIDGE: 3, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'bacon',
    label: '베이컨',
    aliases: ['베이컨'],
    storageDays: { FRIDGE: 7, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'ham',
    label: '햄/스팸',
    aliases: ['햄', '스팸'],
    storageDays: { FRIDGE: 14, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'sausage',
    label: '소시지',
    aliases: ['소시지', '소세지'],
    storageDays: { FRIDGE: 14, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'lamb',
    label: '양고기',
    aliases: ['양고기', '양갈비'],
    storageDays: { FRIDGE: 3, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'rib',
    label: '갈비',
    aliases: ['갈비'],
    storageDays: { FRIDGE: 3, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'shrimp',
    label: '새우',
    aliases: ['새우'],
    storageDays: { FRIDGE: 2, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'squid',
    label: '오징어',
    aliases: ['오징어', '낙지', '문어'],
    storageDays: { FRIDGE: 2, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'clam',
    label: '조개류',
    aliases: ['조개', '바지락', '홍합'],
    storageDays: { FRIDGE: 2, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'fish-cake',
    label: '어묵',
    aliases: ['어묵'],
    storageDays: { FRIDGE: 5, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'anchovy',
    label: '멸치',
    aliases: ['멸치'],
    storageDays: { PANTRY: 30, FRIDGE: 60, FREEZER: 90 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'seaweed',
    label: '미역/다시마',
    aliases: ['미역', '다시마'],
    storageDays: { PANTRY: 180 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'laver',
    label: '김',
    aliases: ['조미김', '김밥김', '김자반'],
    storageDays: { PANTRY: 90 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'crab',
    label: '게',
    aliases: ['꽃게', '대게', '게장'],
    storageDays: { FRIDGE: 2, FREEZER: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'canned-tuna',
    label: '통조림',
    aliases: ['참치캔', '통조림'],
    storageDays: { PANTRY: 365 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'salted-seafood',
    label: '젓갈',
    aliases: ['젓갈', '명란'],
    storageDays: { FRIDGE: 60 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'yogurt',
    label: '요거트',
    aliases: ['요거트', '요구르트', '요플레'],
    storageDays: { FRIDGE: 10 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'cheese',
    label: '치즈',
    aliases: ['치즈'],
    storageDays: { FRIDGE: 14, FREEZER: 60 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'butter',
    label: '버터',
    aliases: ['버터'],
    storageDays: { FRIDGE: 30, FREEZER: 60 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'cream',
    label: '생크림',
    aliases: ['생크림'],
    storageDays: { FRIDGE: 5 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'soy-milk',
    label: '두유',
    aliases: ['두유'],
    storageDays: { FRIDGE: 5, PANTRY: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'dumpling',
    label: '만두',
    aliases: ['만두'],
    storageDays: { FRIDGE: 5, FREEZER: 60 },
    recommendedStorage: 'FREEZER',
  },
  {
    id: 'kimchi',
    label: '김치',
    aliases: ['김치'],
    storageDays: { FRIDGE: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'tteok',
    label: '떡',
    aliases: ['떡'],
    storageDays: { PANTRY: 1, FRIDGE: 4, FREEZER: 30 },
    recommendedStorage: 'FREEZER',
  },
  {
    id: 'noodles',
    label: '국수/면',
    aliases: ['국수', '소면', '칼국수', '우동', '냉면'],
    storageDays: { FRIDGE: 5, PANTRY: 180 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'ramen',
    label: '라면',
    aliases: ['라면'],
    storageDays: { PANTRY: 150 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'pasta',
    label: '파스타',
    aliases: ['파스타', '스파게티'],
    storageDays: { PANTRY: 365 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'bread',
    label: '빵',
    aliases: ['식빵', '빵'],
    storageDays: { PANTRY: 3, FRIDGE: 7, FREEZER: 30 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'rice',
    label: '쌀',
    aliases: ['쌀'],
    storageDays: { PANTRY: 180 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'flour',
    label: '밀가루',
    aliases: ['밀가루', '부침가루', '튀김가루'],
    storageDays: { PANTRY: 180 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'doenjang',
    label: '된장/쌈장',
    aliases: ['된장', '쌈장'],
    storageDays: { FRIDGE: 180, PANTRY: 90 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'soy-sauce',
    label: '간장',
    aliases: ['간장'],
    storageDays: { PANTRY: 180, FRIDGE: 365 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'ketchup',
    label: '케첩',
    aliases: ['케첩', '케찹'],
    storageDays: { FRIDGE: 90, PANTRY: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'mayonnaise',
    label: '마요네즈',
    aliases: ['마요네즈'],
    storageDays: { FRIDGE: 60 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'jam',
    label: '잼',
    aliases: ['잼'],
    storageDays: { FRIDGE: 30, PANTRY: 14 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'sesame-oil',
    label: '참기름/들기름',
    aliases: ['참기름', '들기름'],
    storageDays: { PANTRY: 90 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'cooking-oil',
    label: '식용유',
    aliases: ['식용유', '올리브유', '카놀라유'],
    storageDays: { PANTRY: 180 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'pickles',
    label: '단무지/피클',
    aliases: ['단무지', '피클'],
    storageDays: { FRIDGE: 30 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'juice',
    label: '주스',
    aliases: ['주스', 'juice'],
    storageDays: { FRIDGE: 7 },
    recommendedStorage: 'FRIDGE',
  },
  {
    id: 'nuts',
    label: '견과류',
    aliases: ['견과', '아몬드', '호두'],
    storageDays: { PANTRY: 90, FRIDGE: 180 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'cereal',
    label: '시리얼',
    aliases: ['시리얼', '그래놀라'],
    storageDays: { PANTRY: 90 },
    recommendedStorage: 'PANTRY',
  },
  {
    id: 'ice-cream',
    label: '아이스크림',
    aliases: ['아이스크림'],
    storageDays: { FREEZER: 60 },
    recommendedStorage: 'FREEZER',
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

// IngredientCategory enum 값과 동일한 문자열 유니온 (gql 결합 없이 사용)
export type IngredientCategoryValue =
  | 'MEAT'
  | 'SEAFOOD'
  | 'VEGETABLE'
  | 'FRUIT'
  | 'DAIRY'
  | 'EGG'
  | 'GRAIN'
  | 'SAUCE'
  | 'DRINK'
  | 'SNACK'
  | 'ETC';

// shelf-life 규칙 id → 카테고리. 알려진 품목만 자동 분류하고 나머지는 사용자 선택.
export const RULE_CATEGORY: Record<string, IngredientCategoryValue> = {
  egg: 'EGG',
  milk: 'DAIRY',
  tofu: 'ETC',
  'green-onion': 'VEGETABLE',
  'leafy-greens': 'VEGETABLE',
  onion: 'VEGETABLE',
  potato: 'VEGETABLE',
  carrot: 'VEGETABLE',
  mushroom: 'VEGETABLE',
  apple: 'FRUIT',
  banana: 'FRUIT',
  chicken: 'MEAT',
  pork: 'MEAT',
  beef: 'MEAT',
  fish: 'SEAFOOD',
  'cooked-food': 'ETC',
  spinach: 'VEGETABLE',
  cabbage: 'VEGETABLE',
  'napa-cabbage': 'VEGETABLE',
  cucumber: 'VEGETABLE',
  'sweet-pumpkin': 'VEGETABLE',
  zucchini: 'VEGETABLE',
  gochujang: 'SAUCE',
  pepper: 'VEGETABLE',
  'bell-pepper': 'VEGETABLE',
  garlic: 'VEGETABLE',
  ginger: 'VEGETABLE',
  broccoli: 'VEGETABLE',
  tomato: 'VEGETABLE',
  'sweet-potato': 'VEGETABLE',
  'bean-sprout': 'VEGETABLE',
  corn: 'VEGETABLE',
  chive: 'VEGETABLE',
  'water-parsley': 'VEGETABLE',
  celery: 'VEGETABLE',
  asparagus: 'VEGETABLE',
  cauliflower: 'VEGETABLE',
  salad: 'VEGETABLE',
  orange: 'FRUIT',
  strawberry: 'FRUIT',
  grape: 'FRUIT',
  watermelon: 'FRUIT',
  kiwi: 'FRUIT',
  lemon: 'FRUIT',
  blueberry: 'FRUIT',
  peach: 'FRUIT',
  avocado: 'FRUIT',
  pineapple: 'FRUIT',
  mango: 'FRUIT',
  melon: 'FRUIT',
  'ground-meat': 'MEAT',
  duck: 'MEAT',
  bacon: 'MEAT',
  ham: 'MEAT',
  sausage: 'MEAT',
  lamb: 'MEAT',
  rib: 'MEAT',
  shrimp: 'SEAFOOD',
  squid: 'SEAFOOD',
  clam: 'SEAFOOD',
  'fish-cake': 'SEAFOOD',
  anchovy: 'SEAFOOD',
  seaweed: 'ETC',
  laver: 'ETC',
  crab: 'SEAFOOD',
  'canned-tuna': 'ETC',
  'salted-seafood': 'SEAFOOD',
  yogurt: 'DAIRY',
  cheese: 'DAIRY',
  butter: 'DAIRY',
  cream: 'DAIRY',
  'soy-milk': 'DRINK',
  dumpling: 'ETC',
  kimchi: 'VEGETABLE',
  tteok: 'GRAIN',
  noodles: 'GRAIN',
  ramen: 'GRAIN',
  pasta: 'GRAIN',
  bread: 'GRAIN',
  rice: 'GRAIN',
  flour: 'GRAIN',
  doenjang: 'SAUCE',
  'soy-sauce': 'SAUCE',
  ketchup: 'SAUCE',
  mayonnaise: 'SAUCE',
  jam: 'SAUCE',
  'sesame-oil': 'SAUCE',
  'cooking-oil': 'SAUCE',
  pickles: 'VEGETABLE',
  juice: 'DRINK',
  nuts: 'SNACK',
  cereal: 'SNACK',
  'ice-cream': 'SNACK',
};

// 품목명으로 카테고리 자동 추정 (규칙 매칭 실패 시 null)
export function getCategory(name: string): IngredientCategoryValue | null {
  const rule = findShelfLifeRule(name);
  return rule ? (RULE_CATEGORY[rule.id] ?? null) : null;
}
