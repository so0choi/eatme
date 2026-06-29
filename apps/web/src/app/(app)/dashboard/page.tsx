import Link from 'next/link';
import dayjs from 'dayjs';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ChefHat,
  Clock3,
  Package,
  PiggyBank,
  Snowflake,
  ThermometerSun,
  Warehouse,
} from 'lucide-react';
import { getClient } from '@/app/ApolloClient';
import { GET_ALL_INGREDIENTS, MONTHLY_INGREDIENT_WASTE } from '@/queries/fridge.queries';
import { GET_ALL_RECIPES } from '@/queries/recipe.queries';
import {
  Ingredient,
  IngredientCategory,
  IngredientStatus,
  RecipeDifficulty,
  StorageType,
} from 'gql/graphql';
import IngredientsSection from '@/components/dashboard/IngredientsSection';
import { getIngredientEmoji } from '@/components/fridge/ingredient-icons';

type MonthlyIngredientWaste = {
  month: string;
  totalLoss: number;
  discardedCount: number;
};

type DashboardRecipe = {
  id: number;
  title: string;
  description?: string | null;
  cookTime?: number | null;
  difficulty?: RecipeDifficulty | null;
  ingredients: {
    name: string;
    optional: boolean;
  }[];
};

const storageLabels: Record<StorageType, string> = {
  [StorageType.Fridge]: '냉장',
  [StorageType.Freezer]: '냉동',
  [StorageType.Pantry]: '실온',
};

const storageIcons: Record<StorageType, typeof Snowflake> = {
  [StorageType.Fridge]: ThermometerSun,
  [StorageType.Freezer]: Snowflake,
  [StorageType.Pantry]: Warehouse,
};

const categoryLabels: Record<IngredientCategory, string> = {
  [IngredientCategory.Dairy]: '유제품',
  [IngredientCategory.Drink]: '음료',
  [IngredientCategory.Egg]: '계란',
  [IngredientCategory.Etc]: '기타',
  [IngredientCategory.Fruit]: '과일',
  [IngredientCategory.Grain]: '곡류',
  [IngredientCategory.Meat]: '육류',
  [IngredientCategory.Sauce]: '소스',
  [IngredientCategory.Seafood]: '해산물',
  [IngredientCategory.Snack]: '간식',
  [IngredientCategory.Vegetable]: '채소',
};

function formatWon(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

function getDaysLeft(item: Ingredient) {
  if (!item.expireAt) return null;
  return dayjs(item.expireAt).startOf('day').diff(dayjs().startOf('day'), 'day');
}

function getQuantityLabel(item: Ingredient) {
  if (!item.quantity) return '-';
  return `${item.quantity.toLocaleString('ko-KR')}${item.unit ?? ''}`;
}

function getFreshnessPercent(daysLeft: number | null) {
  if (daysLeft === null) return 0;
  return Math.max(0, Math.min(100, (daysLeft / 14) * 100));
}

function getUseFirstItems(ingredients: Ingredient[]) {
  return [...ingredients]
    .filter((item) => item.expireAt)
    .sort((a, b) => {
      const aDays = getDaysLeft(a) ?? Number.MAX_SAFE_INTEGER;
      const bDays = getDaysLeft(b) ?? Number.MAX_SAFE_INTEGER;
      return aDays - bDays;
    })
    .slice(0, 5);
}

function getMatchedRecipes(recipes: DashboardRecipe[], ingredients: Ingredient[]) {
  const names = ingredients.map((item) => item.name.toLowerCase());

  return recipes
    .map((recipe) => {
      const requiredIngredients = recipe.ingredients.filter((item) => !item.optional);
      const matchedCount = requiredIngredients.filter((recipeIngredient) =>
        names.some(
          (name) =>
            recipeIngredient.name.toLowerCase().includes(name) ||
            name.includes(recipeIngredient.name.toLowerCase()),
        ),
      ).length;

      return {
        ...recipe,
        matchedCount,
        requiredCount: requiredIngredients.length,
      };
    })
    .filter((recipe) => recipe.requiredCount > 0 && recipe.matchedCount > 0)
    .sort((a, b) => b.matchedCount / b.requiredCount - a.matchedCount / a.requiredCount)
    .slice(0, 3);
}

export default async function DashboardPage() {
  const [{ data }, { data: wasteData }, { data: recipeData }] = await Promise.all([
    getClient().query<{ getAllIngredients: Ingredient[] }>({
      query: GET_ALL_INGREDIENTS,
    }),
    getClient().query<{ monthlyIngredientWaste: MonthlyIngredientWaste[] }>({
      query: MONTHLY_INGREDIENT_WASTE,
      variables: { months: 6 },
    }),
    getClient().query<{ getAllRecipes: DashboardRecipe[] }>({
      query: GET_ALL_RECIPES,
    }),
  ]);

  const ingredients = (data?.getAllIngredients ?? []).filter(
    (i) => i.status !== IngredientStatus.Used && i.status !== IngredientStatus.Discarded,
  );
  const recipes = recipeData?.getAllRecipes ?? [];
  const monthlyWaste = wasteData?.monthlyIngredientWaste ?? [];
  const currentMonthWaste = monthlyWaste.at(-1);
  const todayItems = ingredients.filter((item) => {
    const daysLeft = getDaysLeft(item);
    return daysLeft !== null && daysLeft <= 0;
  });
  const threeDayItems = ingredients.filter((item) => {
    const daysLeft = getDaysLeft(item);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
  });
  const weekItems = ingredients.filter((item) => {
    const daysLeft = getDaysLeft(item);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  });
  const expiredItems = ingredients.filter((item) => item.status === IngredientStatus.Expired);
  const riskItems = ingredients.filter((item) => {
    const daysLeft = getDaysLeft(item);
    return daysLeft !== null && daysLeft <= 7;
  });
  const useFirstItems = getUseFirstItems(ingredients);
  const matchedRecipes = getMatchedRecipes(recipes, weekItems.length > 0 ? weekItems : ingredients);
  const totalValue = ingredients.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const riskValue = riskItems.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const storageSummaries = Object.values(StorageType).map((storage) => {
    const items = ingredients.filter((item) => item.storage === storage);
    const urgentCount = items.filter((item) => {
      const daysLeft = getDaysLeft(item);
      return daysLeft !== null && daysLeft <= 3;
    }).length;
    return { storage, count: items.length, urgentCount };
  });
  const categorySummaries = Object.values(IngredientCategory)
    .map((category) => ({
      category,
      count: ingredients.filter((item) => item.category === category).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxCategoryCount = Math.max(...categorySummaries.map((item) => item.count), 1);

  const stats = [
    {
      label: '총 재료',
      value: String(ingredients.length),
      helper: `현재 가치 ${formatWon(totalValue)}`,
      color: 'text-primary',
      bgIcon: 'bg-primary-container/10',
      icon: Package,
      href: '/fridge',
    },
    {
      label: '3일 내 만료',
      value: String(threeDayItems.length),
      helper: todayItems.length > 0 ? `오늘 처리 ${todayItems.length}개` : '오늘 만료 없음',
      color: 'text-tertiary',
      bgIcon: 'bg-tertiary-container/10',
      icon: AlertTriangle,
      href: '/fridge',
    },
    {
      label: '위험 금액',
      value: formatWon(riskValue),
      helper: `7일 내 만료 ${weekItems.length}개`,
      color: 'text-error',
      bgIcon: 'bg-error-container/40',
      icon: PiggyBank,
      href: undefined,
    },
    {
      label: '활용 가능 레시피',
      value: `${matchedRecipes.length}개`,
      helper: '보유 재료 기반 추정',
      color: 'text-org',
      bgIcon: 'bg-secondary-fixed/35',
      icon: ChefHat,
      href: '/recipes',
    },
  ];

  return (
    <div className="space-y-8 pt-2">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05rem] text-primary">
            대시보드
          </p>
          <h1 className="font-display text-4xl font-bold leading-none text-on-surface">
            오늘의 냉장고.
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            먼저 써야 할 재료와 바로 할 수 있는 관리를 한눈에 확인하세요.
          </p>
        </div>
        <Link
          href="/fridge/add"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-ambient transition hover:-translate-y-0.5 hover:opacity-90"
        >
          재료 추가
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const card = (
            <div className="flex min-h-36 items-center justify-between rounded-3xl bg-surface-container-lowest p-6 shadow-ambient transition hover:shadow-ambient">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05rem] text-on-surface-variant">
                  {stat.label}
                </p>
                <p className={`font-display text-4xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="mt-2 text-xs font-semibold text-on-surface-variant">{stat.helper}</p>
              </div>
              <div className={`${stat.bgIcon} rounded-full p-4`}>
                <Icon className={`h-7 w-7 ${stat.color}`} />
              </div>
            </div>
          );

          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={stat.label}>{card}</div>
          );
        })}
      </section>

      <section
        className={`rounded-3xl p-6 shadow-ambient ${
          riskItems.length > 0 ? 'bg-error-container/35' : 'bg-surface-container-lowest'
        }`}
      >
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div
              className={`rounded-2xl p-4 ${
                riskItems.length > 0 ? 'bg-error text-on-primary' : 'bg-primary text-on-primary'
              }`}
            >
              <Clock3 className="h-7 w-7" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05rem] text-primary">
                today action
              </p>
              <h2 className="font-display text-2xl font-bold text-on-surface">
                {riskItems.length > 0
                  ? `${riskItems.length}개 재료를 이번 주 안에 확인해야 해요`
                  : '모든 재료가 안정적으로 관리되고 있어요'}
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {expiredItems.length > 0
                  ? `이미 만료된 재료 ${expiredItems.length}개가 있습니다. 먼저 정리해 주세요.`
                  : `이번 달 기록된 손실은 ${formatWon(currentMonthWaste?.totalLoss ?? 0)}입니다.`}
              </p>
            </div>
          </div>
          <Link
            href={riskItems.length > 0 ? '/fridge' : '/recipes'}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-on-primary px-5 py-3 text-sm font-semibold text-primary shadow-ambient transition hover:-translate-y-0.5"
          >
            {riskItems.length > 0 ? '냉장고 정리하기' : '레시피 둘러보기'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <section className="space-y-4 xl:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-on-surface">
              먼저 써야 할 재료
            </h2>
            <Link
              href="/fridge"
              className="text-sm font-semibold text-primary transition-opacity hover:opacity-80"
            >
              전체 보기
            </Link>
          </div>

          <div className="space-y-3">
            {useFirstItems.length > 0 ? (
              useFirstItems.map((item) => {
                const daysLeft = getDaysLeft(item);
                const badge =
                  daysLeft === null
                    ? '기한 확인'
                    : daysLeft <= 0
                      ? '오늘 처리'
                      : `${daysLeft}일 남음`;
                const freshnessPercent = getFreshnessPercent(daysLeft);
                const meterColor =
                  daysLeft !== null && daysLeft <= 1 ? 'bg-error' : 'bg-tertiary';

                return (
                  <article
                    key={item.id}
                    className="rounded-3xl bg-surface-container-lowest p-5 shadow-ambient"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-surface-container text-4xl">
                        <span aria-hidden="true">{getIngredientEmoji(item.category)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="truncate font-display text-lg font-bold text-on-surface">
                            {item.name}
                          </h3>
                          <span className="shrink-0 rounded-full bg-tertiary-container/20 px-3 py-1 text-xs font-bold text-tertiary">
                            {badge}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {storageLabels[item.storage]} · {getQuantityLabel(item)} ·{' '}
                          {formatWon(item.price ?? 0)}
                        </p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container">
                          <div
                            className={`h-full rounded-full ${meterColor}`}
                            style={{ width: `${freshnessPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-3xl bg-surface-container-lowest p-6 text-sm text-on-surface-variant shadow-ambient">
                만료일이 등록된 재료가 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-8 xl:col-span-7">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-on-surface">
                  보관 위치별 현황
                </h2>
                <Boxes className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-4">
                {storageSummaries.map(({ storage, count, urgentCount }) => {
                  const Icon = storageIcons[storage];
                  const ratio = ingredients.length > 0 ? (count / ingredients.length) * 100 : 0;
                  return (
                    <div key={storage} className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-secondary-fixed/45 p-2 text-org">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-bold text-on-surface">
                            {storageLabels[storage]}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-on-surface-variant">
                          {count}개 · 임박 {urgentCount}개
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-on-surface">
                  카테고리별 보유 현황
                </h2>
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-3">
                {categorySummaries.length > 0 ? (
                  categorySummaries.map(({ category, count }) => (
                    <div key={category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-on-surface">{categoryLabels[category]}</span>
                        <span className="font-semibold text-on-surface-variant">{count}개</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className="h-full rounded-full bg-org"
                          style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-on-surface-variant">표시할 카테고리가 없습니다.</p>
                )}
              </div>
            </article>
          </div>

          <article className="rounded-3xl bg-linear-to-br from-primary to-primary-container p-7 shadow-ambient">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05rem] text-on-primary/80">
                  recipe action
                </p>
                <h2 className="font-display text-2xl font-bold text-on-primary">
                  만료 임박 재료로 만들 수 있는 레시피
                </h2>
              </div>
              <ChefHat className="h-8 w-8 text-on-primary" />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {matchedRecipes.length > 0 ? (
                matchedRecipes.map((recipe) => (
                  <Link
                    key={recipe.id}
                    href={`/recipes/${recipe.id}`}
                    className="rounded-2xl bg-on-primary/95 p-4 text-primary shadow-ambient transition hover:-translate-y-0.5"
                  >
                    <p className="line-clamp-1 font-display text-lg font-bold">{recipe.title}</p>
                    <p className="mt-2 text-xs font-semibold text-on-surface-variant">
                      재료 {recipe.matchedCount}/{recipe.requiredCount}개 보유
                    </p>
                    <p className="mt-3 text-xs font-semibold text-primary">
                      {recipe.cookTime ? `${recipe.cookTime}분` : '시간 정보 없음'}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl bg-on-primary/95 p-4 text-sm font-semibold text-primary md:col-span-3">
                  추천할 레시피 매칭 데이터가 없습니다.
                </div>
              )}
            </div>
          </article>
        </section>
      </div>

      <section>
        <IngredientsSection ingredients={ingredients} />
      </section>
    </div>
  );
}
