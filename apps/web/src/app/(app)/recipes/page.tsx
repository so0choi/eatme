import Image from 'next/image';
import Link from 'next/link';
import { Clock, Users, Soup, ChevronRight, Sparkles } from 'lucide-react';
import { getClient } from '@/app/ApolloClient';
import { GET_ALL_RECIPES } from '@/queries/recipe.queries';
import { GET_ALL_INGREDIENTS } from '@/queries/fridge.queries';
import { GET_COOKING_SHORTS } from '@/queries/youtube.queries';
import { CookingShort, Ingredient, Recipe } from 'gql/graphql';
import { difficultyMeta, formatCookTime } from '@/components/recipe/recipe-meta';
import { getMakeableRecipes, pickRandom } from '@/components/recipe/recipe-match';
import RecipesContent from './RecipesContent';
import CookingShorts from '@/components/recipe/CookingShorts';

export default async function RecipesPage() {
  const [recipeRes, fridgeRes, shortsRes] = await Promise.all([
    getClient().query<{ getAllRecipes: Recipe[] }>({ query: GET_ALL_RECIPES }),
    getClient().query<{ getAllIngredients: Ingredient[] }>({ query: GET_ALL_INGREDIENTS }),
    getClient().query<{ cookingShorts: CookingShort[] }>({ query: GET_COOKING_SHORTS }),
  ]);

  const recipes = recipeRes.data?.getAllRecipes ?? [];
  const ingredientNames = (fridgeRes.data?.getAllIngredients ?? []).map((i) => i.name);
  const cookingShorts = shortsRes.data?.cookingShorts ?? [];

  // 냉장고 재료로 만들 수 있는 레시피 → 없으면 랜덤 추천으로 폴백
  const makeable = getMakeableRecipes(recipes, ingredientNames);
  const isFallback = makeable.length === 0;
  const display = isFallback ? pickRandom(recipes, 6) : makeable;

  const [featured, ...rest] = display;
  const featuredMeta = featured?.difficulty ? difficultyMeta[featured.difficulty] : null;

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Editorial Header */}
      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05rem] text-primary">레시피</p>
        <h1 className="font-display text-4xl font-bold leading-none text-on-surface">오늘 뭐 먹지?</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          {isFallback
            ? '냉장고 재료로 바로 만들 수 있는 레시피가 없어, 추천 레시피를 골라봤어요'
            : `냉장고 속 재료로 만들 수 있는 ${makeable.length}개의 레시피`}
        </p>
      </section>

      {/* Fallback notice */}
      {isFallback && recipes.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-secondary-fixed/40 px-5 py-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-org" />
          <p className="text-sm text-on-secondary-fixed">
            <span className="font-bold">딱 맞는 레시피가 없어요.</span> 그래도 도전해볼 만한 레시피를
            무작위로 추천해드려요. 재료를 더 채우면 만들 수 있는 메뉴가 늘어나요!
          </p>
        </div>
      )}

      {/* Featured Hero */}
      {featured && (
        <Link
          href={`/recipes/${featured.id}`}
          className="group relative block overflow-hidden rounded-3xl shadow-ambient"
        >
          <div className="relative h-72 w-full md:h-80">
            {featured.imageUrl ? (
              <Image
                src={featured.imageUrl}
                alt={featured.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                unoptimized
              />
            ) : (
              <div className="h-full w-full bg-linear-to-br from-primary to-primary-container" />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-on-surface/80 via-on-surface/25 to-transparent" />
          </div>

          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-on-primary/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary backdrop-blur-sm">
              {isFallback ? '추천 레시피' : '지금 만들 수 있어요'}
            </span>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold text-on-primary md:text-4xl">
              {featured.title}
            </h2>
            {featured.description && (
              <p className="mt-2 max-w-xl text-sm text-on-primary/85 line-clamp-2">
                {featured.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-on-primary/90">
              {featuredMeta && (
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${featuredMeta.dot}`} />
                  {featuredMeta.label}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatCookTime(featured.cookTime)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {featured.servings ? `${featured.servings}인분` : '-'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Soup className="h-3.5 w-3.5" />
                재료 {featured.ingredients.length}
              </span>
              <span className="ml-auto hidden items-center gap-1 font-bold text-on-primary opacity-0 transition group-hover:opacity-100 md:inline-flex">
                자세히 보기 <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Search + Grid */}
      {recipes.length === 0 ? (
        <div className="rounded-3xl bg-surface-container-low py-20 text-center">
          <Soup className="mx-auto h-10 w-10 text-on-surface-variant/30" />
          <p className="mt-3 text-sm text-on-surface-variant">아직 등록된 레시피가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <RecipesContent recipes={rest} />
        </div>
      )}

      {/* 유튜브 요리 쇼츠 — 키 미설정/결과 없음이면 컴포넌트 내부에서 미렌더 */}
      <CookingShorts shorts={cookingShorts} />
    </div>
  );
}
