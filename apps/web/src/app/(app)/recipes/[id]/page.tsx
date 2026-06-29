import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Users, Soup, ChefHat, Check } from 'lucide-react';
import { getClient } from '@/app/ApolloClient';
import { GET_RECIPE } from '@/queries/recipe.queries';
import { Recipe } from 'gql/graphql';
import { difficultyMeta, formatAmount, formatCookTime } from '@/components/recipe/recipe-meta';

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipeId = Number(id);
  if (Number.isNaN(recipeId)) notFound();

  const { data } = await getClient().query<{ recipe: Recipe }>({
    query: GET_RECIPE,
    variables: { id: recipeId },
  });

  const recipe = data?.recipe;
  if (!recipe) notFound();

  const meta = recipe.difficulty ? difficultyMeta[recipe.difficulty] : null;

  const stats = [
    { icon: Clock, label: '조리 시간', value: formatCookTime(recipe.cookTime) },
    { icon: Users, label: '분량', value: recipe.servings ? `${recipe.servings}인분` : '-' },
    { icon: ChefHat, label: '난이도', value: meta?.label ?? '-' },
    { icon: Soup, label: '재료', value: `${recipe.ingredients.length}가지` },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Back */}
      <Link
        href="/recipes"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        레시피 목록
      </Link>

      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-surface-container-lowest shadow-ambient">
        <div className="relative h-64 w-full md:h-80">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary to-primary-container">
              <Soup className="h-16 w-16 text-on-primary/40" />
            </div>
          )}
        </div>
        <div className="p-6 md:p-8">
          {meta && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${meta.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          )}
          <h1 className="mt-3 font-display text-3xl font-bold text-on-surface md:text-4xl">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">{recipe.description}</p>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-2xl bg-surface-container-low p-4 text-center"
            >
              <Icon className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                {s.label}
              </p>
              <p className="mt-0.5 font-display text-lg font-bold text-on-surface">{s.value}</p>
            </div>
          );
        })}
      </section>

      {/* Ingredients + Steps */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Ingredients */}
        <section className="lg:col-span-4">
          <div className="rounded-3xl bg-surface-container-low p-4">
            <h2 className="px-2 pb-3 pt-1 font-display text-lg font-bold text-on-surface">재료</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing) => (
                <li
                  key={ing.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-lowest px-4 py-3"
                >
                  <span className="text-sm font-medium text-on-surface">
                    {ing.name}
                    {ing.optional && (
                      <span className="ml-1.5 text-[10px] font-bold uppercase text-on-surface-variant/60">
                        선택
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-semibold text-on-surface-variant">
                    {formatAmount(ing.quantity, ing.unit)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Steps */}
        <section className="lg:col-span-8">
          <h2 className="mb-4 font-display text-2xl font-bold text-on-surface">조리 순서</h2>
          {recipe.steps.length === 0 ? (
            <p className="text-sm text-on-surface-variant">등록된 조리 순서가 없습니다.</p>
          ) : (
            <ol className="space-y-4">
              {recipe.steps.map((step, i) => (
                <li
                  key={i}
                  className="flex gap-4 rounded-3xl bg-surface-container-lowest p-5 shadow-ambient"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary font-display text-base font-bold text-on-primary">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-sm leading-relaxed text-on-surface-variant">{step}</p>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-6 flex items-center gap-2 rounded-2xl bg-primary-container/15 px-5 py-4">
            <Check className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-on-primary-container">
              완성! 맛있게 드세요 🍽️
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
