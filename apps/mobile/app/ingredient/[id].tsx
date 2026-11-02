import { useMutation, useQuery } from '@apollo/client/react';
import { storageLabels } from '@eatme/core';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import {
  DELETE_INGREDIENT,
  GET_ALL_INGREDIENTS,
  GET_INGREDIENT,
  type IngredientCategory,
  type IngredientUnit,
  type StorageType,
  UPDATE_INGREDIENT,
} from '../../src/api/documents';
import { Button, Notice, Screen, ScreenHeader, TextField } from '../../src/ui';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const UNITS: IngredientUnit[] = ['EA', 'G', 'KG', 'ML', 'L'];
const STORAGES = Object.keys(storageLabels) as StorageType[];
const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  MEAT: '육류',
  SEAFOOD: '수산물',
  VEGETABLE: '채소',
  FRUIT: '과일',
  DAIRY: '유제품',
  EGG: '달걀',
  GRAIN: '곡류',
  SAUCE: '소스',
  DRINK: '음료',
  SNACK: '간식',
  ETC: '기타',
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as IngredientCategory[];

const toKstDate = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10) : '');
const fromKstDate = (date: string) => new Date(`${date}T00:00:00+09:00`).toISOString();

function Chips<T extends string>({ label, options, value, onChange, format }: {
  label: string;
  options: T[];
  value: T | null;
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-on-surface">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => (
          <Pressable
            key={o}
            accessibilityRole="button"
            accessibilityState={{ selected: o === value }}
            onPress={() => onChange(o)}
            className={`rounded-full px-4 py-2 ${o === value ? 'bg-primary' : 'bg-surface-container'}`}
          >
            <Text className={o === value ? 'text-on-primary' : 'text-on-surface'}>{format(o)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function IngredientEdit() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Number(rawId);
  const { data, loading, error: loadError } = useQuery(GET_INGREDIENT, { variables: { id }, skip: !Number.isInteger(id) });
  const [update, { loading: saving }] = useMutation(UPDATE_INGREDIENT, { refetchQueries: [GET_ALL_INGREDIENTS] });
  const [remove] = useMutation(DELETE_INGREDIENT, { refetchQueries: [GET_ALL_INGREDIENTS] });

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [expireAt, setExpireAt] = useState('');
  const [unit, setUnit] = useState<IngredientUnit | null>(null);
  const [storage, setStorage] = useState<StorageType>('FRIDGE');
  const [category, setCategory] = useState<IngredientCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ingredient = data?.ingredient;
  useEffect(() => {
    if (!ingredient) return;
    setName(ingredient.name);
    setQuantity(ingredient.quantity != null ? String(ingredient.quantity) : '');
    setPrice(ingredient.price != null ? String(ingredient.price) : '');
    setExpireAt(toKstDate(ingredient.expireAt));
    setUnit(ingredient.unit);
    setStorage(ingredient.storage);
    setCategory(ingredient.category);
  }, [ingredient]);

  const save = async () => {
    const qty = quantity.trim() === '' ? null : Number(quantity);
    const won = price.trim() === '' ? null : Number(price);
    if (!name.trim()) return setError('이름을 입력해 주세요.');
    if (qty != null && (!Number.isFinite(qty) || qty < 0)) return setError('수량을 숫자로 입력해 주세요.');
    if (won != null && (!Number.isInteger(won) || won < 0)) return setError('가격을 원 단위 숫자로 입력해 주세요.');
    if (expireAt.trim() !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(expireAt.trim())) {
      return setError('유통기한은 2026-11-03 형식으로 입력해 주세요.');
    }
    setError(null);
    try {
      await update({
        variables: {
          input: {
            id,
            name: name.trim(),
            quantity: qty,
            price: won,
            unit,
            storage,
            category,
            expireAt: expireAt.trim() === '' ? null : fromKstDate(expireAt.trim()),
          },
        },
      });
      router.back();
    } catch {
      setError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  const confirmDelete = () =>
    Alert.alert('재료를 삭제할까요?', '기록에서 완전히 지워져요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          void remove({ variables: { id } })
            .then(() => router.back())
            .catch(() => setError('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.')),
      },
    ]);

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="재료 수정" />
      {loadError ? <Notice message="재료를 불러오지 못했어요." /> : null}
      {loading && !ingredient ? <Text className="text-on-surface-variant">불러오는 중…</Text> : null}
      {ingredient ? (
        <View className="gap-4">
          <TextField label="이름" value={name} onChangeText={setName} />
          <TextField label="수량" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
          <Chips label="단위" options={UNITS} value={unit} onChange={setUnit} format={(u) => u} />
          <TextField label="가격(원)" value={price} onChangeText={setPrice} keyboardType="number-pad" />
          <TextField
            label="유통기한 (YYYY-MM-DD)"
            value={expireAt}
            onChangeText={setExpireAt}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
          <Chips label="보관 위치" options={STORAGES} value={storage} onChange={setStorage} format={(s) => storageLabels[s]} />
          <Chips label="카테고리" options={CATEGORIES} value={category} onChange={setCategory} format={(c) => CATEGORY_LABELS[c]} />
          {error ? <Notice message={error} /> : null}
          <Button label="저장" loading={saving} onPress={() => void save()} />
          <Button label="삭제" variant="secondary" onPress={confirmDelete} />
          <Button label="취소" variant="ghost" onPress={() => router.back()} />
        </View>
      ) : null}
    </Screen>
  );
}
