import Link from 'next/link';
import { AlertTriangle, Plus, Sparkles } from 'lucide-react';
import { getClient } from '@/app/ApolloClient';
import { GET_ALL_INGREDIENTS } from '@/queries/fridge.queries';
import { Ingredient, IngredientStatus } from 'gql/graphql';
import FridgeTable from '@/components/fridge/FridgeTable';

export default async function FridgePage() {
  const { data } = await getClient().query<{ getAllIngredients: Ingredient[] }>({
    query: GET_ALL_INGREDIENTS,
  });

  // 사용 완료(USED) 처리한 식재료는 냉장고 UI에서 숨긴다.
  const ingredients = (data?.getAllIngredients ?? []).filter(
    (i) => i.status !== IngredientStatus.Used,
  );
  const imminentCount = ingredients.filter(
    (i) => i.status === IngredientStatus.ExpiringSoon,
  ).length;
  const expiredCount = ingredients.filter((i) => i.status === IngredientStatus.Expired).length;
  const needsAttention = imminentCount + expiredCount;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.05rem] text-primary mb-1">
            냉장고
          </p>
          <h1 className="font-display text-4xl font-bold text-on-surface leading-none">
            식재료 현황
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            {ingredients.length}개 식재료 관리 중
          </p>
        </div>
        <Link
          href="/fridge/add"
          className="bg-primary text-on-primary rounded-2xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 shadow-ambient hover:opacity-90 hover:-translate-y-0.5 transition-all self-start"
        >
          <Plus className="h-4 w-4" />
          재료 추가
        </Link>
      </div>

      {/* 슬림 알림 배너 — 실제 만료 임박/지남 개수 */}
      {needsAttention > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-error-container/70 px-5 py-3.5 shadow-ambient">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-error/10 text-error shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <p className="text-sm text-on-surface">
            {imminentCount > 0 && (
              <>
                <span className="font-bold text-error">곧 만료 {imminentCount}개</span>
                {expiredCount > 0 && <span className="text-on-surface-variant"> · </span>}
              </>
            )}
            {expiredCount > 0 && (
              <span className="font-bold text-outline">이미 만료 {expiredCount}개</span>
            )}
            <span className="text-on-surface-variant"> — 확인이 필요한 식재료가 있어요.</span>
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-surface-container-lowest px-5 py-3.5 shadow-ambient">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary-container/20 text-primary shrink-0">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-on-surface">
            모든 식재료가 신선하게 관리되고 있어요.
          </p>
        </div>
      )}

      {/* 인벤토리 테이블 (검색·정렬·필터·페이지네이션) */}
      <FridgeTable ingredients={ingredients} />
    </div>
  );
}
