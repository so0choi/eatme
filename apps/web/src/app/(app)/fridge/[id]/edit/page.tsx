import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getClient } from '@/app/ApolloClient';
import { GET_INGREDIENT } from '@/queries/fridge.queries';
import FridgeForm from '@/components/fridge/FridgeForm';
import { updateIngredient } from '@/components/fridge/actions/update-ingredient';
import { Ingredient } from 'gql/graphql';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditIngredientPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const { data } = await getClient().query<{ ingredient: Ingredient }>({
    query: GET_INGREDIENT,
    variables: { id },
  });

  const ingredient = data?.ingredient;
  if (!ingredient) {
    notFound();
  }

  const boundAction = updateIngredient.bind(null, ingredient.id);

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <Link
          href="/fridge"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.05rem] text-on-surface-variant hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          냉장고로 돌아가기
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.05rem] text-primary mb-1">
          재료 수정
        </p>
        <h1 className="font-display text-4xl font-bold text-on-surface tracking-tight">
          {ingredient.name}
        </h1>
        <p className="text-sm text-on-surface-variant mt-2 max-w-lg">
          저장된 정보를 업데이트하여 디지털 냉장고를 정확하게 유지하세요.
        </p>
      </div>

      <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-ambient">
        <FridgeForm
          action={boundAction}
          submitLabel="수정 저장"
          defaultValues={{
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            storage: ingredient.storage,
            category: ingredient.category,
            expireAt: ingredient.expireAt,
          }}
        />
      </div>
    </div>
  );
}
