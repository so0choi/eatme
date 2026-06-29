import { Package, AlertTriangle, PiggyBank } from 'lucide-react';
import dayjs from 'dayjs';
import { getClient } from '@/app/ApolloClient';
import { GET_ALL_INGREDIENTS } from '@/queries/fridge.queries';
import { Ingredient, IngredientStatus } from 'gql/graphql';
import IngredientsSection from '@/components/dashboard/IngredientsSection';
import { getIngredientEmoji } from '@/components/fridge/ingredient-icons';

export default async function DashboardPage() {
  const { data } = await getClient().query<{ getAllIngredients: Ingredient[] }>({
    query: GET_ALL_INGREDIENTS,
  });

  const ingredients = data?.getAllIngredients ?? [];
  const expiringItems = ingredients.filter((i) => i.status === IngredientStatus.ExpiringSoon);
  const totalValue = ingredients.reduce((sum, i) => sum + (i.price ?? 0), 0);

  const stats = [
    {
      label: '총 재료',
      value: String(ingredients.length),
      color: 'text-primary',
      bgIcon: 'bg-primary-container/10',
      iconColor: 'text-primary',
      icon: Package,
    },
    {
      label: '곧 만료',
      value: String(expiringItems.length),
      color: 'text-tertiary',
      bgIcon: 'bg-tertiary-container/10',
      iconColor: 'text-tertiary',
      icon: AlertTriangle,
    },
    {
      label: '총 재료 가치',
      value: `₩${totalValue.toLocaleString('ko-KR')}`,
      color: 'text-org',
      bgIcon: 'bg-secondary-fixed/30',
      iconColor: 'text-org',
      icon: PiggyBank,
    },
  ];

  return (
    <div className="space-y-8 pt-2">
      {/* Editorial Title */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.05rem] text-primary mb-1">
          대시보드
        </p>
        <h1 className="font-display text-4xl font-bold text-on-surface leading-none">
          냉장고 현황.
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">재료를 정확하게 관리하세요.</p>
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.05rem] text-on-surface-variant mb-1">
                  {stat.label}
                </p>
                <p className={`font-display text-4xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`${stat.bgIcon} p-4 rounded-full`}>
                <Icon className={`h-7 w-7 ${stat.iconColor}`} />
              </div>
            </div>
          );
        })}
      </section>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left: Expiring Soon */}
        <section className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-on-surface">곧 만료</h2>
            <a
              href="#"
              className="text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
            >
              전체 보기
            </a>
          </div>

          {expiringItems.length === 0 ? (
            <p className="text-sm text-on-surface-variant">만료 임박 재료가 없습니다.</p>
          ) : (
            expiringItems.slice(0, 2).map((item) => {
              const daysLeft = item.expireAt ? dayjs(item.expireAt).diff(dayjs(), 'day') : null;
              const badge =
                daysLeft === null
                  ? '만료 임박'
                  : daysLeft <= 0
                    ? '오늘 만료'
                    : `${daysLeft}일 후 만료`;
              const freshnessPercent = Math.max(
                0,
                Math.min(100, daysLeft !== null ? (daysLeft / 7) * 100 : 0),
              );
              const meterColor = daysLeft !== null && daysLeft <= 1 ? 'bg-error' : 'bg-tertiary';

              return (
                <div
                  key={item.id}
                  className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-ambient group relative"
                >
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-surface-container-lowest/90 backdrop-blur-sm text-tertiary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                      {badge}
                    </span>
                  </div>
                  <div className="h-44 bg-surface-container flex items-center justify-center">
                    <span className="text-7xl leading-none" aria-hidden="true">
                      {getIngredientEmoji(item.category)}
                    </span>
                  </div>
                  <div className="p-6 bg-surface-container-lowest/80 backdrop-blur-md">
                    <h3 className="font-display text-lg font-semibold text-on-surface mb-0.5">
                      {item.name}
                    </h3>
                    <p className="text-sm text-on-surface-variant mb-4">
                      {item.storage} · {item.quantity}
                      {item.unit ?? ''}
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold uppercase tracking-[0.05rem] text-on-surface-variant">
                        <span>신선도</span>
                        <span>{Math.round(freshnessPercent)}% 남음</span>
                      </div>
                      <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                        <div
                          className={`h-full ${meterColor} rounded-full`}
                          style={{ width: `${freshnessPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Right: All Ingredients */}
        <section className="xl:col-span-7">
          <IngredientsSection ingredients={ingredients} />
        </section>
      </div>
    </div>
  );
}
