'use client';

import Form from 'next/form';
import { useActionState, useState, type ChangeEvent } from 'react';
import { Snowflake, Package, UtensilsCrossed } from 'lucide-react';
import { format } from 'date-fns';
import TextField from '../form/TextField';
import { DatePicker } from '../date-picker';
import { CATEGORY_OPTIONS } from './filter-options';
import type { AddIngredientState } from './actions/add-ingredient';
import {
  findShelfLifeRule,
  getRecommendedUseBy,
  storageLabels,
  type StorageZone,
} from './shelf-life-rules';

export type FridgeFormDefaults = {
  name?: string | null;
  price?: number | null;
  quantity?: number | null;
  unit?: string | null;
  storage?: StorageZone | string | null;
  category?: string | null;
  expireAt?: string | Date | null;
};

// 폼에서 선택 가능한 실제 카테고리 (사이드바용 '전체' 옵션 제외)
const categorySelectOptions = CATEGORY_OPTIONS.filter((o) => o.category !== null);

type FridgeFormProps = {
  action: (state: AddIngredientState, formData: FormData) => Promise<AddIngredientState>;
  defaultValues?: FridgeFormDefaults;
  submitLabel?: string;
};

const zoneOptions: {
  value: StorageZone;
  label: string;
  Icon: React.ElementType;
}[] = [
  { value: 'FRIDGE', label: '냉장', Icon: Snowflake },
  { value: 'FREEZER', label: '냉동', Icon: UtensilsCrossed },
  { value: 'PANTRY', label: '실온', Icon: Package },
];

const inputClass =
  'w-full rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all';

function normalizeStorage(value: FridgeFormDefaults['storage']): StorageZone {
  if (value === 'FRIDGE' || value === 'FREEZER' || value === 'PANTRY') {
    return value;
  }
  return 'FRIDGE';
}

function toDate(value: FridgeFormDefaults['expireAt']): Date | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

const FridgeForm = ({ action, defaultValues, submitLabel = '확인 & 저장' }: FridgeFormProps) => {
  const [state, formAction, pending] = useActionState(action, null);
  const [name, setName] = useState(defaultValues?.name ?? '');
  const [zone, setZone] = useState<StorageZone>(normalizeStorage(defaultValues?.storage));
  const [expireAt, setExpireAt] = useState<Date | undefined>(toDate(defaultValues?.expireAt));
  const [storageTouched, setStorageTouched] = useState(Boolean(defaultValues?.storage));

  const fieldError = (field: string) => state?.error?.[field]?.[0];
  const shelfLifeRule = findShelfLifeRule(name);
  const recommendation = getRecommendedUseBy(name, zone);

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextName = event.target.value;
    setName(nextName);
    const nextRule = findShelfLifeRule(nextName);
    if (!storageTouched && nextRule) {
      setZone(nextRule.recommendedStorage);
    }
  };

  const handleZoneChange = (value: StorageZone) => {
    setStorageTouched(true);
    setZone(value);
  };

  return (
    <Form className="space-y-7" action={formAction}>
      {/* 폼 전체 에러 */}
      {fieldError('_form') && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {fieldError('_form')}
        </div>
      )}

      {/* 재료명 */}
      <TextField
        id="name"
        name="name"
        label="재료명"
        placeholder="예: 시금치"
        required
        defaultValue={defaultValues?.name ?? ''}
        onChange={handleNameChange}
        error={fieldError('name')}
        className={inputClass}
      />

      {/* 가격 */}
      <TextField
        id="price"
        name="price"
        label="가격"
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        placeholder="예: 3500"
        defaultValue={defaultValues?.price ?? ''}
        error={fieldError('price')}
        className={inputClass}
      />

      {/* 수량 + 단위 */}
      <div className="grid grid-cols-2 gap-4">
        <TextField
          id="quantity"
          name="quantity"
          label="수량"
          type="number"
          placeholder="250"
          defaultValue={defaultValues?.quantity ?? ''}
          error={fieldError('quantity')}
          className={inputClass}
        />
        <div>
          <label htmlFor="unit" className="text-sm font-semibold text-on-surface-variant">
            단위
          </label>
          <select
            id="unit"
            name="unit"
            defaultValue={defaultValues?.unit ?? 'G'}
            className={`mt-2 ${inputClass} appearance-none`}
          >
            <option value="G">그램 (g)</option>
            <option value="KG">킬로그램 (kg)</option>
            <option value="ML">밀리리터 (ml)</option>
            <option value="L">리터 (l)</option>
            <option value="EA">개 (ea)</option>
          </select>
        </div>
      </div>

      {/* 카테고리 */}
      <div>
        <label
          htmlFor="category"
          className="block text-xs font-semibold uppercase tracking-[0.05rem] text-primary"
        >
          카테고리
        </label>
        <select
          id="category"
          name="category"
          defaultValue={defaultValues?.category ?? ''}
          className={`mt-2 ${inputClass} appearance-none`}
        >
          <option value="">카테고리 선택</option>
          {categorySelectOptions.map((o) => (
            <option key={o.key} value={o.category as string}>
              {o.label}
            </option>
          ))}
        </select>
        {fieldError('category') && (
          <p className="mt-1 text-xs text-destructive">{fieldError('category')}</p>
        )}
      </div>

      {/* 보관 위치 */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-[0.05rem] text-primary">
          보관 위치
        </label>
        <input type="hidden" name="storage" value={zone} />
        <div className="flex flex-wrap gap-3">
          {zoneOptions.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleZoneChange(value)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all ${
                zone === value
                  ? 'bg-org text-on-primary shadow-ambient'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        {fieldError('storage') && (
          <p className="text-xs text-destructive">{fieldError('storage')}</p>
        )}
        {shelfLifeRule && shelfLifeRule.recommendedStorage !== zone && (
          <p className="text-xs font-semibold text-on-surface-variant">
            {shelfLifeRule.label}은 보통 {storageLabels[shelfLifeRule.recommendedStorage]} 보관을
            추천해요.
          </p>
        )}
      </div>

      {/* 유통기한 */}
      <div className="space-y-2">
        <label
          htmlFor="expireAt"
          className="block text-xs font-semibold uppercase tracking-[0.05rem] text-primary"
        >
          유통기한
        </label>
        <DatePicker
          name="expireAt"
          placeholder="날짜를 직접 선택하거나 추천값 사용"
          className={`${inputClass} w-full`}
          disabled={pending}
          disabledDates={{ before: startOfToday() }}
          value={expireAt}
          onChange={setExpireAt}
        />
        {recommendation ? (
          <div className="rounded-2xl bg-primary-container/15 px-4 py-3 text-sm text-on-surface-variant">
            <p className="font-semibold text-on-surface">
              권장 소비기한 {format(recommendation.useBy, 'yyyy. MM. dd')}
            </p>
            <p className="mt-1">
              {recommendation.rule.label}은 {storageLabels[zone]} 보관 기준 {recommendation.days}
              일 내 소비를 추천해요. 날짜를 직접 선택하지 않으면 이 추천 날짜로 저장됩니다.
            </p>
          </div>
        ) : shelfLifeRule ? (
          <div className="rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
            {shelfLifeRule.label}은 {storageLabels[zone]} 보관 기준이 없어 권장 소비기한을
            자동 계산하지 않습니다.
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant">
            등록된 기본 보관 기준이 있으면 권장 소비기한을 자동으로 계산합니다.
          </p>
        )}
        {fieldError('expireAt') && (
          <p className="text-xs text-destructive">{fieldError('expireAt')}</p>
        )}
      </div>

      {/* 버튼 */}
      <div className="pt-2 flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-primary text-on-primary rounded-2xl py-3.5 font-semibold shadow-ambient hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? '저장 중...' : submitLabel}
        </button>
        <button
          type="reset"
          className="px-8 text-primary rounded-2xl py-3.5 font-semibold hover:bg-surface-container transition-all"
        >
          초기화
        </button>
      </div>
    </Form>
  );
};

export default FridgeForm;
