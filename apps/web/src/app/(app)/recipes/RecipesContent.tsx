'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Clock, Users, Soup, ArrowUpRight } from 'lucide-react';
import { Recipe, RecipeDifficulty } from 'gql/graphql';
import { difficultyMeta, formatCookTime } from '@/components/recipe/recipe-meta';

const filters: { value: RecipeDifficulty | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: RecipeDifficulty.Easy, label: '쉬움' },
  { value: RecipeDifficulty.Medium, label: '보통' },
  { value: RecipeDifficulty.Hard, label: '어려움' },
];

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const meta = recipe.difficulty ? difficultyMeta[recipe.difficulty] : null;

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group block rounded-3xl bg-surface-container-lowest overflow-hidden shadow-ambient transition hover:-translate-y-1"
    >
      <div className="relative h-48 overflow-hidden">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            width={600}
            height={192}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-surface-container flex items-center justify-center">
            <Soup className="h-12 w-12 text-on-surface-variant/25" />
          </div>
        )}
        {meta && (
          <span
            className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm ${meta.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        )}
        <span className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-surface-container-lowest/85 text-on-surface-variant backdrop-blur-sm opacity-0 transition group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg font-semibold text-on-surface line-clamp-1">
          {recipe.title}
        </h3>
        {recipe.description && (
          <p className="mt-1 text-sm text-on-surface-variant line-clamp-2 min-h-[2.5rem]">
            {recipe.description}
          </p>
        )}
        <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {formatCookTime(recipe.cookTime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            {recipe.servings ? `${recipe.servings}인분` : '-'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Soup className="h-3.5 w-3.5 text-primary" />
            재료 {recipe.ingredients.length}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function RecipesContent({ recipes }: { recipes: Recipe[] }) {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<RecipeDifficulty | 'ALL'>('ALL');

  const filtered = recipes
    .filter((r) => difficulty === 'ALL' || r.difficulty === difficulty)
    .filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {/* Search + Filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="레시피 검색..."
            className="w-64 rounded-xl bg-surface-container pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 transition focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-surface-container-low p-1">
          {filters.map((f) => {
            const active = difficulty === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setDifficulty(f.value)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                  active
                    ? 'bg-primary text-on-primary shadow-ambient'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-surface-container-low py-20 text-center">
          <Soup className="mx-auto h-10 w-10 text-on-surface-variant/30" />
          <p className="mt-3 text-sm text-on-surface-variant">조건에 맞는 레시피가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </>
  );
}
