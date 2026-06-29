import { Ingredient, IngredientStatus } from 'gql/graphql';
import Link from 'next/link';
import dayjs from 'dayjs';
import { getIngredientEmoji } from '@/components/fridge/ingredient-icons';

const statusConfig: Record<
  IngredientStatus,
  { label: string; className: string }
> = {
  [IngredientStatus.Fresh]: {
    label: '신선',
    className: 'bg-primary-container/10 text-primary',
  },
  [IngredientStatus.ExpiringSoon]: {
    label: '만료 임박',
    className: 'bg-tertiary-container/10 text-tertiary',
  },
  [IngredientStatus.Expired]: {
    label: '만료',
    className: 'bg-error-container/10 text-error',
  },
  [IngredientStatus.Used]: {
    label: '사용됨',
    className: 'bg-surface-container text-on-surface-variant',
  },
  [IngredientStatus.Discarded]: {
    label: '폐기',
    className: 'bg-error-container/10 text-error',
  },
};

const IngredientsList: React.FC<{ ingredients: Ingredient[] }> = ({
  ingredients,
}) => {
  return ingredients.map((item) => {
    const status = statusConfig[item.status || IngredientStatus.Fresh];
    return (
      <Link
        key={item.id}
        href={`/fridge/${item.id}/edit`}
        className="rounded-2xl bg-surface-container-lowest px-5 py-4 flex items-center gap-4 hover:shadow-ambient transition cursor-pointer"
      >
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-container shrink-0 flex items-center justify-center">
          <span className="text-2xl leading-none" aria-hidden="true">
            {getIngredientEmoji(item.category)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-sm font-semibold text-on-surface truncate">
            {item.name}
          </h4>
          <p className="text-xs text-on-surface-variant">{item.storage}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.05rem] text-on-surface-variant mb-0.5">
              만료일
            </p>
            <p className="text-xs font-semibold text-on-surface">
              {item.expireAt ? dayjs(item.expireAt).format('YYYY. MM. DD') : <span className="text-on-surface-variant/40">-</span>}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${status.className}`}
          >
            {status.label}
          </span>
        </div>
      </Link>
    );
  });
};
export default IngredientsList;
