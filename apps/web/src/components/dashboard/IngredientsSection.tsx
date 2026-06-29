'use client';

import { useState } from 'react';
import { Ingredient, StorageType } from 'gql/graphql';
import IngredientsList from './IngredientsList';

const filters: { label: string; value: StorageType | null }[] = [
  { label: '전체', value: null },
  { label: '냉장', value: StorageType.Fridge },
  { label: '냉동', value: StorageType.Freezer },
  { label: '실온', value: StorageType.Pantry },
];

export default function IngredientsSection({ ingredients }: { ingredients: Ingredient[] }) {
  const [active, setActive] = useState<StorageType | null>(null);

  const filtered = active ? ingredients.filter((i) => i.storage === active) : ingredients;

  return (
    <div className="rounded-3xl bg-surface-container-low p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h2 className="font-display text-xl font-bold text-on-surface">전체 재료</h2>
        <div className="flex gap-2 flex-wrap">
          {filters.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setActive(value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-all ${
                active === value
                  ? 'bg-primary text-on-primary'
                  : 'bg-secondary-fixed text-on-secondary-fixed hover:opacity-80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length > 0 ? (
          <IngredientsList ingredients={filtered} />
        ) : (
          <p className="text-sm text-on-surface-variant">재료가 없습니다.</p>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <a
          className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          href="/fridge"
        >
          더 보기
        </a>
      </div>
    </div>
  );
}
