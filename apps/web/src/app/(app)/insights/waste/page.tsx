import Link from 'next/link';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  BrainCircuit,
  Download,
  PiggyBank,
  Shapes,
  Trash2,
} from 'lucide-react';
import { getClient } from '@/app/ApolloClient';
import { GET_ALL_INGREDIENTS, MONTHLY_INGREDIENT_WASTE } from '@/queries/fridge.queries';
import { WasteLineChart, WasteReasonChart, WasteTrendPoint } from '@/components/insights/WasteCharts';
import { Ingredient, IngredientCategory, IngredientStatus } from 'gql/graphql';

type MonthlyIngredientWaste = {
  month: string;
  totalLoss: number;
  discardedCount: number;
};

const categoryLabels: Record<IngredientCategory, string> = {
  [IngredientCategory.Dairy]: '유제품',
  [IngredientCategory.Drink]: '음료',
  [IngredientCategory.Egg]: '계란',
  [IngredientCategory.Etc]: '기타',
  [IngredientCategory.Fruit]: '과일류',
  [IngredientCategory.Grain]: '곡류',
  [IngredientCategory.Meat]: '육류',
  [IngredientCategory.Sauce]: '소스',
  [IngredientCategory.Seafood]: '해산물',
  [IngredientCategory.Snack]: '간식',
  [IngredientCategory.Vegetable]: '채소류',
};

function formatWon(value: number) {
  return `${value.toLocaleString('ko-KR')} KRW`;
}

function formatMonth(month: string) {
  const [, monthNumber] = month.split('-');
  return `${Number(monthNumber)}월`;
}

function formatDate(value: string | Date) {
  return dayjs(value).format('YYYY.MM.DD');
}

function getQuantityLabel(item: Ingredient) {
  if (!item.quantity) return '-';
  return `${item.quantity.toLocaleString('ko-KR')}${item.unit ?? ''}`;
}

function getCurrentMonthDailyWaste(discardedIngredients: Ingredient[]): WasteTrendPoint[] {
  const today = dayjs();
  const startOfMonth = today.startOf('month');
  const daysInMonth = today.daysInMonth();
  const buckets = Array.from({ length: daysInMonth }, (_, index) => {
    const day = startOfMonth.add(index, 'day');
    return {
      key: day.format('YYYY-MM-DD'),
      label: `${day.date()}일`,
      totalLoss: 0,
      discardedCount: 0,
    };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  discardedIngredients.forEach((item) => {
    const discardedAt = dayjs(item.updatedAt);
    if (!discardedAt.isSame(today, 'month')) return;
    const bucket = bucketMap.get(discardedAt.format('YYYY-MM-DD'));
    if (!bucket) return;
    bucket.totalLoss += item.price ?? 0;
    bucket.discardedCount += 1;
  });

  return buckets.map(({ key: _key, ...bucket }) => bucket);
}

function getReasonData(discardedIngredients: Ingredient[]) {
  const expiredCount = discardedIngredients.filter((item) => {
    if (!item.expireAt) return false;
    return dayjs(item.expireAt).isBefore(dayjs(item.updatedAt), 'day');
  }).length;
  const otherCount = Math.max(discardedIngredients.length - expiredCount, 0);

  return [
    { name: '유통기한 만료', value: expiredCount, color: 'var(--color-primary)' },
    { name: '기타 폐기', value: otherCount, color: 'var(--color-surface-container)' },
  ];
}

function getTopCategory(discardedIngredients: Ingredient[]) {
  const counts = new Map<IngredientCategory, number>();

  discardedIngredients.forEach((item) => {
    if (!item.category) return;
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  });

  const [category, count] =
    Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? [IngredientCategory.Etc, 0];

  return {
    label: count > 0 ? categoryLabels[category] : '-',
    ratio:
      discardedIngredients.length > 0 ? Math.round((count / discardedIngredients.length) * 100) : 0,
  };
}

export default async function WasteInsightPage() {
  const [{ data: wasteData }, { data: ingredientData }] = await Promise.all([
    getClient().query<{ monthlyIngredientWaste: MonthlyIngredientWaste[] }>({
      query: MONTHLY_INGREDIENT_WASTE,
      variables: { months: 6 },
    }),
    getClient().query<{ getAllIngredients: Ingredient[] }>({
      query: GET_ALL_INGREDIENTS,
    }),
  ]);

  const monthlyWaste = wasteData?.monthlyIngredientWaste ?? [];
  const ingredients = ingredientData?.getAllIngredients ?? [];
  const activeIngredients = ingredients.filter(
    (item) => item.status !== IngredientStatus.Discarded && item.status !== IngredientStatus.Used,
  );
  const discardedIngredients = ingredients.filter(
    (item) => item.status === IngredientStatus.Discarded,
  );
  const currentMonthWaste = monthlyWaste.at(-1);
  const previousMonthWaste = monthlyWaste.at(-2);
  const currentMonthLoss = currentMonthWaste?.totalLoss ?? 0;
  const currentMonthCount = currentMonthWaste?.discardedCount ?? 0;
  const previousMonthLoss = previousMonthWaste?.totalLoss ?? 0;
  const lossChange =
    previousMonthLoss > 0
      ? Math.round(((currentMonthLoss - previousMonthLoss) / previousMonthLoss) * 100)
      : null;
  const topCategory = getTopCategory(discardedIngredients);
  const reasonData = getReasonData(discardedIngredients);
  const dailyWaste = getCurrentMonthDailyWaste(discardedIngredients);
  const monthlyTrend = monthlyWaste.map((item) => ({
    label: formatMonth(item.month),
    totalLoss: item.totalLoss,
    discardedCount: item.discardedCount,
  }));
  const recentLogs = [...discardedIngredients]
    .sort((a, b) => dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf())
    .slice(0, 5);

  const stats = [
    {
      label: '월간 총 손실액',
      value: formatWon(currentMonthLoss),
      description:
        lossChange === null
          ? '전월 비교 데이터 없음'
          : `전월 대비 ${Math.abs(lossChange)}% ${lossChange <= 0 ? '감소' : '증가'}`,
      Icon: PiggyBank,
      accent: 'text-primary',
    },
    {
      label: '폐기 품목 수',
      value: `${currentMonthCount.toLocaleString('ko-KR')}개`,
      description: `현재 보관 중인 품목 ${activeIngredients.length.toLocaleString('ko-KR')}개`,
      Icon: Trash2,
      accent: 'text-on-surface',
    },
    {
      label: '최다 폐기 카테고리',
      value: topCategory.label,
      description: `총 폐기의 ${topCategory.ratio}% 차지`,
      Icon: Shapes,
      accent: 'text-tertiary',
    },
  ];

  return (
    <div className="max-w-7xl space-y-8 pt-2">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.05rem] text-on-surface-variant transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            대시보드로 돌아가기
          </Link>
          <h1 className="font-display text-4xl font-bold leading-none text-primary">
            폐기 통계
          </h1>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-primary-container/40 px-7 py-6 shadow-ambient">
        <div className="relative z-10 flex items-center gap-5">
          <div className="rounded-2xl bg-primary p-4 text-on-primary">
            <BrainCircuit className="h-7 w-7" />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05rem] text-primary">
              Fresh harvest logic
            </p>
            <p className="font-display text-xl font-bold text-on-primary-container">
              {topCategory.label === '-'
                ? '아직 폐기 패턴을 분석할 데이터가 충분하지 않습니다.'
                : `이번 달 ${topCategory.label} 폐기가 높습니다. 구매량과 보관 주기를 점검해 보세요.`}
            </p>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-on-primary/20" />
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {stats.map(({ label, value, description, Icon, accent }) => (
          <article
            key={label}
            className="flex min-h-40 flex-col justify-between rounded-3xl bg-surface-container-lowest p-7 shadow-ambient"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-bold text-on-surface">{label}</p>
              <Icon className={`h-6 w-6 ${accent}`} />
            </div>
            <div>
              <p className={`font-display text-4xl font-bold ${accent}`}>{value}</p>
              <p className="mt-3 text-sm font-semibold text-on-surface-variant">{description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-3xl bg-surface-container-lowest p-7 shadow-ambient">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05rem] text-primary">
              Daily trend
            </p>
            <h2 className="font-display text-3xl font-bold text-on-surface">
              이번 달 일별 폐기 흐름
            </h2>
          </div>
          <div className="flex gap-2">
            <span className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-on-primary">
              손실액
            </span>
            <span className="rounded-xl bg-primary-container/35 px-3 py-2 text-xs font-bold text-on-primary-container">
              품목수
            </span>
          </div>
        </div>
        <WasteLineChart data={dailyWaste} height={300} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_22rem]">
        <article className="rounded-3xl bg-surface-container-lowest p-7 shadow-ambient">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05rem] text-primary">
                Monthly trend
              </p>
              <h2 className="font-display text-3xl font-bold text-on-surface">
                월간 폐기 트렌드
              </h2>
            </div>
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <WasteLineChart data={monthlyTrend} height={360} />
        </article>

        <article className="rounded-3xl bg-surface-container-lowest p-7 shadow-ambient">
          <div className="mb-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05rem] text-primary">
              Reason
            </p>
            <h2 className="font-display text-3xl font-bold text-on-surface">
              폐기 사유 분석
            </h2>
          </div>
          <WasteReasonChart data={reasonData} />
        </article>
      </section>

      <section className="overflow-hidden rounded-3xl bg-surface-container-lowest shadow-ambient">
        <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05rem] text-primary">
              Disposal log
            </p>
            <h2 className="font-display text-3xl font-bold text-on-surface">
              폐기 로그 상세
            </h2>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-2xl bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface-variant"
          >
            <Download className="h-4 w-4" />
            엑셀 다운로드
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-surface-container-low">
              <tr className="text-sm font-bold text-on-surface-variant">
                <th className="px-7 py-4">날짜</th>
                <th className="px-7 py-4">품목명</th>
                <th className="px-7 py-4">수량</th>
                <th className="px-7 py-4">손실액</th>
                <th className="px-7 py-4">사유</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length > 0 ? (
                recentLogs.map((item) => {
                  const expired =
                    item.expireAt && dayjs(item.expireAt).isBefore(dayjs(item.updatedAt), 'day');
                  return (
                    <tr key={item.id} className="bg-surface-container-lowest">
                      <td className="px-7 py-4 text-sm text-on-surface-variant">
                        {formatDate(item.updatedAt)}
                      </td>
                      <td className="px-7 py-4 font-display text-lg font-bold text-on-surface">
                        {item.name}
                      </td>
                      <td className="px-7 py-4 text-sm text-on-surface">{getQuantityLabel(item)}</td>
                      <td className="px-7 py-4 font-display text-lg font-bold text-error">
                        {formatWon(item.price ?? 0)}
                      </td>
                      <td className="px-7 py-4">
                        <span
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${
                            expired
                              ? 'bg-error-container/45 text-error'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {expired ? '유통기한' : '기타'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-7 py-12 text-center text-sm text-on-surface-variant">
                    아직 폐기된 식재료가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {discardedIngredients.length > recentLogs.length && (
          <div className="px-7 py-5 text-center text-sm font-semibold text-on-surface-variant">
            최근 {recentLogs.length}개 / 전체 {discardedIngredients.length}개 표시
          </div>
        )}
      </section>
    </div>
  );
}
