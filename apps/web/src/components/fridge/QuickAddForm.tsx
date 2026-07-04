'use client';

import { useActionState, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  Sparkles,
  Snowflake,
  UtensilsCrossed,
  Package,
  Beef,
  Fish,
  Carrot,
  Apple,
  Milk,
  Egg,
  Wheat,
  Droplet,
  CupSoda,
  Cookie,
  ChevronDown,
} from 'lucide-react';
import {
  parseIngredientInput,
  formatQuantity,
  formatPrice,
} from './parse-ingredient-input';
import { findShelfLifeRule, getCategory, type StorageZone } from './shelf-life-rules';
import { CATEGORY_OPTIONS } from './filter-options';
import { quickAddIngredients, type QuickAddState } from './actions/quick-add-ingredients';

const textareaClass =
  'block w-full rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-none overflow-hidden';

const STORAGE_ZONES: StorageZone[] = ['FRIDGE', 'FREEZER', 'PANTRY'];
const zoneMeta: Record<StorageZone, { label: string; Icon: React.ElementType }> = {
  FRIDGE: { label: '냉장', Icon: Snowflake },
  FREEZER: { label: '냉동', Icon: UtensilsCrossed },
  PANTRY: { label: '실온', Icon: Package },
};

// 폼에서 고를 수 있는 실제 카테고리 (사이드바용 '전체' 옵션 제외)
const categoryOptions = CATEGORY_OPTIONS.filter((o) => o.category !== null);

// 카테고리 값 → 아이콘
const categoryIcon: Record<string, React.ElementType> = {
  MEAT: Beef,
  SEAFOOD: Fish,
  VEGETABLE: Carrot,
  FRUIT: Apple,
  DAIRY: Milk,
  EGG: Egg,
  GRAIN: Wheat,
  SAUCE: Droplet,
  DRINK: CupSoda,
  SNACK: Cookie,
  ETC: Package,
};

// 품목명 기반 보관위치 자동 추정 (규칙 없으면 냉장)
function autoStorage(name: string): StorageZone {
  return findShelfLifeRule(name)?.recommendedStorage ?? 'FRIDGE';
}

// 품목명 기반 카테고리 자동 추정 (규칙 없으면 기타)
function autoCategory(name: string): string {
  return getCategory(name) ?? 'ETC';
}

const QuickAddForm = () => {
  const [state, formAction, pending] = useActionState<QuickAddState, FormData>(
    quickAddIngredients,
    null,
  );
  const [raw, setRaw] = useState('');
  // 사용자가 바꾼 보관위치/카테고리 (라인 index 기준). 없으면 자동 추정값 사용.
  const [overrides, setOverrides] = useState<Record<string, StorageZone>>({});
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 입력하는 즉시 파싱해 미리보기 (제출 전 확인)
  const preview = useMemo(() => parseIngredientInput(raw), [raw]);

  // 내용 높이에 맞춰 textarea 높이 자동 확장 (기본 1줄, 줄이 늘면 늘어남)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [raw]);

  // 부분 실패 시 서버가 돌려준 미저장 라인만 남긴다 (이미 저장된 라인 중복 방지).
  useEffect(() => {
    if (state?.remainingRaw !== undefined) setRaw(state.remainingRaw);
  }, [state]);

  // Enter=저장, Shift+Enter=줄바꿈. IME 조합 중(한글 입력)에는 제출하지 않음.
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!pending && raw.trim()) e.currentTarget.form?.requestSubmit();
    }
  };

  // override는 라인 index가 아니라 라인 내용(key) 기준 — 줄 추가/삭제/재정렬에도 올바른 재료에 유지.
  const setStorageZone = (key: string, zone: StorageZone) => {
    setOverrides((prev) => ({ ...prev, [key]: zone }));
  };

  const setCategory = (key: string, category: string) => {
    setCategoryOverrides((prev) => ({ ...prev, [key]: category }));
  };

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <label
            htmlFor="raw"
            className="text-xs font-semibold uppercase tracking-[0.05rem] text-primary"
          >
            빠른 입력
          </label>
        </div>
        <textarea
          id="raw"
          name="raw"
          ref={textareaRef}
          rows={1}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="감자, 500g, 3천원"
          className={textareaClass}
        />
        <p className="mt-2 text-xs text-on-surface-variant">
          한 줄에 하나씩,{' '}
          <span className="font-semibold text-on-surface">품목, 수량, 가격</span>을 쉼표로 구분해요.
          <span className="font-semibold text-on-surface"> Enter</span>로 저장,
          <span className="font-semibold text-on-surface"> Shift+Enter</span>로 줄 추가. 보관 위치는
          자동 지정되며 원클릭으로 바꿀 수 있어요.
        </p>
      </div>

      {/* 실시간 파싱 미리보기 */}
      {preview.length > 0 && (
        <div className="space-y-2">
          {preview.map((item, i) => {
            const key = item.raw; // 라인 내용을 override 키로 사용
            const storage = overrides[key] ?? autoStorage(item.name);
            const category = categoryOverrides[key] ?? autoCategory(item.name);
            const CategoryIcon = categoryIcon[category] ?? Package;
            const categoryLabel =
              categoryOptions.find((o) => o.category === category)?.label ?? '기타';
            return (
              <div key={i} className="rounded-2xl bg-surface-container-low p-4">
                {/* 1행: 값 (품목 · 수량 · 가격) */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-on-surface">
                    {item.name || <span className="text-tertiary">품목 미인식</span>}
                  </span>
                  {formatQuantity(item) && (
                    <span className="rounded-full bg-secondary-fixed px-2.5 py-0.5 text-xs font-semibold text-on-secondary-fixed">
                      {formatQuantity(item)}
                    </span>
                  )}
                  {formatPrice(item) && (
                    <span className="rounded-full bg-primary-container/25 px-2.5 py-0.5 text-xs font-semibold text-on-primary-container">
                      {formatPrice(item)}
                    </span>
                  )}
                  {item.issues.length > 0 && (
                    <span className="text-xs text-tertiary sm:ml-auto">
                      {item.issues.join(' · ')}
                    </span>
                  )}
                </div>

                {/* 2행: 컨트롤 (카테고리 · 보관위치) */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* 카테고리 — 선택된 값을 아이콘 칩으로 표시, 투명 select로 변경 */}
                  <div className="relative flex items-center gap-1 rounded-full bg-secondary-fixed py-1 pl-2.5 pr-1.5 text-xs font-semibold text-on-secondary-fixed transition-opacity hover:opacity-90">
                    <CategoryIcon className="h-3.5 w-3.5" />
                    <span>{categoryLabel}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                    <select
                      name={`category_${i}`}
                      value={category}
                      onChange={(e) => setCategory(key, e.target.value)}
                      aria-label="카테고리"
                      className="absolute inset-0 cursor-pointer opacity-0"
                    >
                      {categoryOptions.map((o) => (
                        <option key={o.key} value={o.category as string}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 보관위치 — 냉장·냉동·실온 모두 표시, 선택된 것 강조, 원클릭 직접 선택 */}
                  <div className="flex w-full items-center gap-0.5 rounded-full bg-surface-container p-0.5 sm:ml-auto sm:w-auto">
                    {STORAGE_ZONES.map((zone) => {
                      const { label, Icon } = zoneMeta[zone];
                      const active = zone === storage;
                      return (
                        <button
                          key={zone}
                          type="button"
                          onClick={() => setStorageZone(key, zone)}
                          aria-pressed={active}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors sm:flex-none ${
                            active
                              ? 'bg-org text-on-primary shadow-ambient'
                              : 'text-on-surface-variant hover:text-primary'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <input type="hidden" name={`storage_${i}`} value={storage} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {state?.error && (
        <div className="rounded-xl bg-tertiary-container/20 px-4 py-3 text-sm text-tertiary">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || preview.length === 0}
        className="w-full rounded-2xl bg-primary py-3.5 font-semibold text-on-primary shadow-ambient transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? '저장 중...' : `${preview.length || ''}개 재료 저장`}
      </button>
    </form>
  );
};

export default QuickAddForm;