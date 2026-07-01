'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Search,
  Pencil,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Filter,
  Package,
  Leaf,
  Tag,
  X,
  Loader2,
} from 'lucide-react';
import { Ingredient, IngredientStatus, StorageType } from 'gql/graphql';
import {
  CATEGORY_LABELS,
  STORAGE_OPTIONS,
  STATUS_OPTIONS,
  CATEGORY_OPTIONS,
} from './filter-options';
import { discardIngredient } from './actions/discard-ingredient';
import { markIngredientUsed } from './actions/mark-ingredient-used';
import { getIngredientEmoji } from './ingredient-icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type FreshnessStatus = 'expired' | 'imminent' | 'good';

const storageLabels: Record<StorageType, string> = {
  [StorageType.Fridge]: '냉장',
  [StorageType.Freezer]: '냉동',
  [StorageType.Pantry]: '실온',
};

function getStatus(ingredientStatus: IngredientStatus): FreshnessStatus {
  // status는 백엔드 스케줄러(IngredientStatusScheduler)가 expireAt 기준으로 매일 갱신한다.
  if (ingredientStatus === IngredientStatus.Expired) return 'expired';
  if (ingredientStatus === IngredientStatus.ExpiringSoon) return 'imminent';
  return 'good';
}

function getFreshness(
  expireAt: string | null | undefined,
  createdAt: string | null | undefined,
  ingredientStatus: IngredientStatus,
): number {
  if (!expireAt) {
    if (ingredientStatus === IngredientStatus.Expired) return 5;
    if (ingredientStatus === IngredientStatus.ExpiringSoon) return 25;
    return 90;
  }
  const start = createdAt ? dayjs(createdAt).startOf('day') : dayjs().startOf('day');
  const end = dayjs(expireAt).startOf('day');
  const today = dayjs().startOf('day');
  const totalDays = Math.max(1, end.diff(start, 'day'));
  const daysLeft = end.diff(today, 'day');
  return Math.max(0, Math.min(100, (daysLeft / totalDays) * 100));
}

function FreshnessBar({ freshness, status }: { freshness: number; status: FreshnessStatus }) {
  const color =
    status === 'imminent' ? 'bg-error' : status === 'expired' ? 'bg-outline' : 'bg-primary';
  return (
    <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${freshness}%` }} />
    </div>
  );
}

function ExpiryCell({
  expireAt,
  status,
}: {
  expireAt: string | null | undefined;
  status: FreshnessStatus;
}) {
  const daysLeft = expireAt
    ? dayjs(expireAt).startOf('day').diff(dayjs().startOf('day'), 'day')
    : null;
  const formatted = expireAt ? dayjs(expireAt).format('YYYY. MM. DD') : '-';
  const textColor =
    status === 'imminent'
      ? 'text-error'
      : status === 'expired'
        ? 'text-outline'
        : 'text-on-surface-variant';
  const subColor =
    status === 'imminent'
      ? 'text-error/60'
      : status === 'expired'
        ? 'text-outline/70'
        : 'text-on-surface-variant/60';

  return (
    <div>
      <p className={`text-sm font-bold ${textColor}`}>{formatted}</p>
      {daysLeft !== null && (
        <p className={`text-[10px] font-bold uppercase ${subColor}`}>
          {daysLeft < 0 ? `${-daysLeft}일 지남` : `${daysLeft}일 남음`}
        </p>
      )}
    </div>
  );
}

// 정렬·필터·페이지네이션 로직만 TanStack에 위임하고, 셀 렌더링은 디자인 시스템 마크업을 직접 사용한다.
const columns: ColumnDef<Ingredient>[] = [
  { accessorKey: 'name', filterFn: 'includesString' },
  { accessorKey: 'category', filterFn: 'equalsString' },
  { accessorKey: 'storage', filterFn: 'equalsString' },
  { accessorKey: 'status', filterFn: 'equalsString' },
  { accessorKey: 'quantity' },
  {
    accessorKey: 'expireAt',
    // null(유통기한 없음)은 항상 뒤로
    sortingFn: (a, b) => {
      const av = a.original.expireAt ? dayjs(a.original.expireAt).valueOf() : Infinity;
      const bv = b.original.expireAt ? dayjs(b.original.expireAt).valueOf() : Infinity;
      return av - bv;
    },
  },
];

// 아이콘 + 라벨 + 셰브론 칩 형태의 필터. 값이 선택되면 primary로 채워 활성 상태를 명확히 한다.
function FilterSelect({
  icon: Icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const isActive = value !== '';
  return (
    <div className="relative">
      <Icon
        className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
          isActive ? 'text-on-primary' : 'text-on-surface-variant'
        }`}
      />
      <ChevronDown
        className={`pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
          isActive ? 'text-on-primary/80' : 'text-on-surface-variant/60'
        }`}
      />
      <select
        aria-label={`${label} 필터`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`cursor-pointer appearance-none rounded-full py-2.5 pl-9 pr-8 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          isActive
            ? 'bg-primary text-on-primary shadow-ambient'
            : 'bg-surface-container text-on-surface-variant hover:text-primary'
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const FACET_IDS = ['storage', 'status', 'category'] as const;

const sortableHeaders: { id: 'name' | 'quantity' | 'expireAt'; label: string; className?: string }[] = [
  { id: 'name', label: '식재료' },
  { id: 'quantity', label: '수량', className: 'text-center' },
  { id: 'expireAt', label: '유통기한' },
];

export default function FridgeTable({ ingredients }: { ingredients: Ingredient[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'expireAt', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const data = useMemo(() => ingredients, [ingredients]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  // 단일 값 필터 헬퍼 ('' = 전체 → 필터 제거)
  const filterValue = (id: string) => (table.getColumn(id)?.getFilterValue() as string) ?? '';
  const setFilter = (id: string, value: string) =>
    table.getColumn(id)?.setFilterValue(value || undefined);

  const hasActiveFacets = FACET_IDS.some((id) => filterValue(id) !== '');
  const clearFacets = () =>
    FACET_IDS.forEach((id) => table.getColumn(id)?.setFilterValue(undefined));

  // 체크(사용 완료) — status를 USED로 변경하면 fridge 목록에서 숨겨진다.
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [, startMarkTransition] = useTransition();
  const handleMarkUsed = (id: number) => {
    if (markingId !== null) return;
    setMarkingId(id);
    startMarkTransition(async () => {
      const result = await markIngredientUsed(id);
      setMarkingId(null);
      if (!result.success) window.alert(result.error ?? '처리에 실패했습니다.');
    });
  };

  // 폐기 — 손실 이력을 남기고 status를 DISCARDED로 변경한다.
  const [pendingDiscard, setPendingDiscard] = useState<{ id: number; name: string } | null>(null);
  const [isDiscarding, startDiscardTransition] = useTransition();
  const confirmDiscard = () => {
    if (!pendingDiscard) return;
    const { id } = pendingDiscard;
    startDiscardTransition(async () => {
      const result = await discardIngredient(id);
      if (result.success) {
        setPendingDiscard(null);
      } else {
        window.alert(result.error ?? '폐기에 실패했습니다.');
      }
    });
  };

  const search = (table.getColumn('name')?.getFilterValue() as string) ?? '';
  const rows = table.getRowModel().rows;
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const rangeStart = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  const sortIcon = (id: string) => {
    const dir = sorting.find((s) => s.id === id)?.desc;
    if (dir === undefined) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return dir ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />;
  };

  return (
    <section className="space-y-4">
      {/* Toolbar: 검색 + 패싯 필터 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setFilter('name', e.target.value)}
            placeholder="식재료 검색..."
            className="pl-10 pr-4 py-2.5 rounded-xl bg-surface-container text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest w-56 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="hidden items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-on-surface-variant sm:inline-flex">
            <Filter className="h-3.5 w-3.5" />
            필터
          </span>

          <FilterSelect
            icon={Package}
            label="보관위치"
            value={filterValue('storage')}
            onChange={(v) => setFilter('storage', v)}
            options={STORAGE_OPTIONS.filter((o) => o.storage !== null).map((o) => ({
              value: o.storage as string,
              label: o.label,
            }))}
          />

          <FilterSelect
            icon={Leaf}
            label="신선도"
            value={filterValue('status')}
            onChange={(v) => setFilter('status', v)}
            options={STATUS_OPTIONS.map((o) => ({ value: o.status, label: o.label }))}
          />

          <FilterSelect
            icon={Tag}
            label="카테고리"
            value={filterValue('category')}
            onChange={(v) => setFilter('category', v)}
            options={CATEGORY_OPTIONS.filter((o) => o.category !== null).map((o) => ({
              value: o.category as string,
              label: o.label,
            }))}
          />

          {hasActiveFacets && (
            <button
              type="button"
              onClick={clearFacets}
              className="inline-flex items-center gap-1 rounded-full px-3 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            >
              <X className="h-3.5 w-3.5" />
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-surface-container-low rounded-3xl p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-on-surface-variant text-xs font-black uppercase tracking-[0.12em]">
                {sortableHeaders.map((h) => (
                  <th key={h.id} className={`px-5 pb-2 ${h.className ?? ''}`}>
                    <button
                      type="button"
                      onClick={() => table.getColumn(h.id)?.toggleSorting()}
                      className={`inline-flex items-center gap-1 hover:text-primary transition-colors ${
                        h.className === 'text-center' ? 'mx-auto' : ''
                      }`}
                    >
                      {h.label}
                      {sortIcon(h.id)}
                    </button>
                  </th>
                ))}
                <th className="px-5 pb-2">카테고리</th>
                <th className="px-5 pb-2">신선도</th>
                <th className="px-5 pb-2 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-on-surface-variant">
                    재료가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map(({ original: item }) => {
                  const status = getStatus(item.status ?? IngredientStatus.Fresh);
                  const freshness = getFreshness(
                    item.expireAt,
                    item.createdAt,
                    item.status ?? IngredientStatus.Fresh,
                  );
                  const cellBg =
                    status === 'imminent'
                      ? 'bg-error-container/40'
                      : status === 'expired'
                        ? 'bg-outline-variant/30'
                        : 'bg-surface-container-lowest';
                  const statusEmoji =
                    status === 'imminent' ? '⚠️' : status === 'expired' ? '🚫' : null;
                  const statusLabel =
                    status === 'imminent'
                      ? '유통기한 임박'
                      : status === 'expired'
                        ? '유통기한 지남'
                        : '';

                  return (
                    <tr
                      key={item.id}
                      className="group hover:scale-[1.005] transition-transform duration-200"
                    >
                      <td className={`px-5 py-4 ${cellBg} rounded-l-2xl`}>
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-surface-container flex-shrink-0 overflow-hidden flex items-center justify-center">
                            <span className="text-2xl leading-none" aria-hidden="true">
                              {getIngredientEmoji(item.category)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-on-surface text-sm flex items-center gap-1.5">
                              {statusEmoji && (
                                <span
                                  role="img"
                                  aria-label={statusLabel}
                                  title={statusLabel}
                                  className="text-sm leading-none"
                                >
                                  {statusEmoji}
                                </span>
                              )}
                              {item.name}
                            </p>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">
                              {storageLabels[item.storage]}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-5 py-4 ${cellBg} text-center`}>
                        <p className="font-semibold text-sm text-on-surface">
                          {item.quantity != null ? `${item.quantity}${item.unit ?? ''}` : '-'}
                        </p>
                      </td>
                      <td className={`px-5 py-4 ${cellBg}`}>
                        <ExpiryCell expireAt={item.expireAt} status={status} />
                      </td>
                      <td className={`px-5 py-4 ${cellBg}`}>
                        <span className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed rounded-full text-[10px] font-black uppercase tracking-wider">
                          {item.category ? (CATEGORY_LABELS[item.category] ?? item.category) : '-'}
                        </span>
                      </td>
                      <td className={`px-5 py-4 ${cellBg} min-w-[140px]`}>
                        <FreshnessBar freshness={freshness} status={status} />
                      </td>
                      <td className={`px-5 py-4 ${cellBg} rounded-r-2xl text-right`}>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/fridge/${item.id}/edit`}
                            aria-label="재료 수정"
                            className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleMarkUsed(item.id)}
                            disabled={markingId === item.id}
                            aria-label="사용 완료"
                            title="사용 완료"
                            className="p-2 hover:bg-primary-container/20 rounded-lg text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {markingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDiscard({ id: item.id, name: item.name })}
                            aria-label="재료 폐기"
                            title="폐기"
                            className="p-2 hover:bg-error/10 rounded-lg text-on-surface-variant hover:text-error transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalFiltered > 0 && (
          <div className="mt-4 flex items-center justify-between px-2">
            <p className="text-xs font-semibold text-on-surface-variant tabular-nums">
              {rangeStart}–{rangeEnd} / 총 {totalFiltered}개
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="이전 페이지"
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-on-surface-variant tabular-nums px-1">
                {pageIndex + 1} / {table.getPageCount()}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="다음 페이지"
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 폐기 확인 다이얼로그 */}
      <AlertDialog
        open={pendingDiscard !== null}
        onOpenChange={(open) => {
          if (!open && !isDiscarding) setPendingDiscard(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>식재료를 폐기할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              &lsquo;{pendingDiscard?.name}&rsquo;을(를) 폐기하고 금전 손실 이력을 남깁니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDiscarding}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDiscard();
              }}
              disabled={isDiscarding}
              className="bg-error text-on-error"
            >
              {isDiscarding ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  폐기 중...
                </span>
              ) : (
                '폐기'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
