import dayjs from 'dayjs';
import {
  Camera,
  Info,
  Leaf,
  Package,
  ShoppingBasket,
  Snowflake,
  Timer,
  UtensilsCrossed,
} from 'lucide-react';

import { getClient } from '@/app/ApolloClient';
import { GET_ALL_INGREDIENTS } from '@/queries/fridge.queries';
import FridgeForm from '@/components/fridge/FridgeForm';
import { addIngredient } from '@/components/fridge/actions/add-ingredient';
import { Ingredient, IngredientStatus, StorageType } from 'gql/graphql';

const storageMeta: Record<
  StorageType,
  { label: string; Icon: React.ElementType; barColor: string; textColor: string }
> = {
  [StorageType.Fridge]: {
    label: '냉장',
    Icon: Snowflake,
    barColor: 'bg-primary',
    textColor: 'text-primary',
  },
  [StorageType.Freezer]: {
    label: '냉동',
    Icon: UtensilsCrossed,
    barColor: 'bg-org',
    textColor: 'text-org',
  },
  [StorageType.Pantry]: {
    label: '선반',
    Icon: Package,
    barColor: 'bg-tertiary',
    textColor: 'text-tertiary',
  },
};

function getStatusBadge(item: Ingredient) {
  if (item.status === IngredientStatus.Expired) {
    return { text: '만료', badgeClass: 'bg-error/10 text-error' };
  }
  if (item.status === IngredientStatus.ExpiringSoon) {
    return { text: '긴급', badgeClass: 'bg-tertiary-container/30 text-tertiary' };
  }
  return { text: '신선', badgeClass: 'bg-primary/10 text-primary' };
}

function getSubText(item: Ingredient) {
  if (item.expireAt) {
    const daysLeft = dayjs(item.expireAt).diff(dayjs(), 'day');
    if (daysLeft < 0) return '기한 지남';
    if (daysLeft === 0) return '오늘 만료';
    if (daysLeft === 1) return '내일 만료';
    return `${daysLeft}일 남음`;
  }
  return storageMeta[item.storage].label + ' 보관 중';
}

function pickIcon(item: Ingredient): React.ElementType {
  if (item.status === IngredientStatus.ExpiringSoon || item.status === IngredientStatus.Expired) {
    return Timer;
  }
  if (item.category === 'VEGETABLE' || item.category === 'FRUIT') return Leaf;
  return ShoppingBasket;
}

export default async function AddIngredientPage() {
  const { data } = await getClient().query<{ getAllIngredients: Ingredient[] }>({
    query: GET_ALL_INGREDIENTS,
  });

  const ingredients = data?.getAllIngredients ?? [];

  const recent = [...ingredients]
    .sort((a, b) => {
      const aUrgent =
        a.status === IngredientStatus.ExpiringSoon || a.status === IngredientStatus.Expired
          ? 0
          : 1;
      const bUrgent =
        b.status === IngredientStatus.ExpiringSoon || b.status === IngredientStatus.Expired
          ? 0
          : 1;
      if (aUrgent !== bUrgent) return aUrgent - bUrgent;
      return dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf();
    })
    .slice(0, 3);

  const total = ingredients.length || 1;
  const capacityBars = (Object.keys(storageMeta) as StorageType[]).map((storage) => {
    const count = ingredients.filter((i) => i.storage === storage).length;
    return {
      storage,
      label: storageMeta[storage].label,
      percent: Math.round((count / total) * 100),
      count,
      barColor: storageMeta[storage].barColor,
      textColor: storageMeta[storage].textColor,
    };
  });

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.05rem] text-primary mb-1">
          냉장고
        </p>
        <h1 className="font-display text-4xl font-bold text-on-surface tracking-tight">
          재료 채우기
        </h1>
        <p className="text-sm text-on-surface-variant mt-2 max-w-lg">
          신선한 식재료를 입력하여 주방의 실제 재고와 디지털 냉장고를 동기화하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 rounded-3xl bg-surface-container-lowest p-8 shadow-ambient">
          <FridgeForm action={addIngredient} />
        </div>

        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-3xl bg-linear-to-br from-primary to-primary-container p-8 shadow-ambient">
            <h3 className="font-display text-2xl font-bold text-on-primary mb-2">
              스캔 &amp; 자동 입력
            </h3>
            <p className="text-on-primary/80 text-sm mb-6 leading-relaxed">
              AI가 영수증에서 식재료, 수량, 유통기한을 자동으로 인식합니다.
            </p>
            <button
              type="button"
              className="w-full py-3 rounded-2xl bg-on-primary/10 text-on-primary font-semibold hover:bg-on-primary hover:text-primary transition-all flex items-center justify-center gap-2"
            >
              <Camera className="h-5 w-5" />
              스캐너 시작
            </button>
          </div>

          <div className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-bold text-on-surface">재고 현황</h3>
              <Info className="h-4 w-4 text-on-surface-variant/40" />
            </div>
            <div className="space-y-4">
              {recent.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  아직 등록된 재료가 없습니다.
                </p>
              ) : (
                recent.map((item) => {
                  const badge = getStatusBadge(item);
                  const Icon = pickIcon(item);
                  return (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-primary-container/20 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-on-surface">{item.name}</p>
                          <p className="text-xs text-on-surface-variant">{getSubText(item)}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase ${badge.badgeClass}`}
                      >
                        {badge.text}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-surface-container-low p-6">
            <h4 className="text-xs font-semibold uppercase tracking-[0.05rem] text-primary mb-5">
              보관 분포
            </h4>
            <div className="space-y-4">
              {capacityBars.map(({ storage, label, percent, count, barColor, textColor }) => (
                <div key={storage}>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-on-surface-variant">
                      {label} · {count}개
                    </span>
                    <span className={textColor}>{percent}%</span>
                  </div>
                  <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
