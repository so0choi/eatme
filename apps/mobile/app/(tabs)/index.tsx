import { useMutation, useQuery } from '@apollo/client/react';
import { storageLabels, type StorageZone } from '@eatme/core';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DISCARD_INGREDIENT,
  GET_ALL_INGREDIENTS,
  type Ingredient,
  type IngredientStatus,
  UPDATE_INGREDIENT,
} from '../../src/api/documents';
import { groupIngredients } from '../../src/fridge/group-ingredients';
import { IngredientRow } from '../../src/fridge/IngredientRow';
import { useUndoableUse } from '../../src/fridge/useUndoableUse';
import { Button, Notice } from '../../src/ui';

const EXAMPLE_INPUT = '감자 500g 3천원';
const ZONES: StorageZone[] = ['FRIDGE', 'FREEZER', 'PANTRY'];

export default function FridgeScreen() {
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(GET_ALL_INGREDIENTS, { notifyOnNetworkStatusChange: true });
  const [updateIngredient] = useMutation(UPDATE_INGREDIENT, { refetchQueries: [GET_ALL_INGREDIENTS] });
  const [discardIngredient] = useMutation(DISCARD_INGREDIENT, { refetchQueries: [GET_ALL_INGREDIENTS] });

  const setStatus = useCallback(
    (id: number, status: IngredientStatus) => updateIngredient({ variables: { input: { id, status } } }),
    [updateIngredient],
  );
  const { use, undo, pending, hiddenIds, error: useError } = useUndoableUse(setStatus);

  const items = useMemo(
    () => (data?.getAllIngredients ?? []).filter((i) => !hiddenIds.has(i.id)),
    [data, hiddenIds],
  );
  const { expiringSoon, byStorage } = useMemo(() => groupIngredients(items), [items]);
  // 서버 데이터 기준: 방금 사용함 처리해 숨긴 재료가 있는 동안(실행취소 토스트)에는 첫 사용 안내를 띄우지 않는다.
  const isEmpty =
    !loading && !error && !!data && data.getAllIngredients.every((i) => i.status === 'USED' || i.status === 'DISCARDED') && !pending;

  const confirmDiscard = (item: Ingredient) =>
    Alert.alert('폐기할까요?', `${item.name}을(를) 폐기 처리해요. 되돌릴 수 없어요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '폐기',
        style: 'destructive',
        onPress: () => void discardIngredient({ variables: { id: item.id } }).catch(() =>
          Alert.alert('폐기에 실패했어요', '잠시 후 다시 시도해 주세요.'),
        ),
      },
    ]);

  const renderRow = (item: Ingredient) => (
    <IngredientRow
      key={item.id}
      item={item}
      onPress={() => router.push(`/ingredient/${item.id}`)}
      onUse={() => void use(item)}
      onDiscard={() => confirmDiscard(item)}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        contentContainerClassName="grow gap-6 px-6 pb-28 pt-6"
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => void refetch()} />}
      >
        <Text className="text-3xl font-bold text-on-surface">내 냉장고</Text>
        {error ? (
          <Notice message="재료를 불러오지 못했어요.">
            <Button label="다시 시도" variant="secondary" onPress={() => void refetch()} />
          </Notice>
        ) : null}
        {useError ? <Notice message={useError} /> : null}

        {isEmpty ? (
          <View className="items-center gap-4 rounded-3xl bg-surface-container-lowest p-8">
            <Text className="text-xl font-bold text-on-surface">첫 재료 3개를 넣어보세요</Text>
            <Text className="text-center text-sm text-on-surface-variant">
              이렇게 한 줄로 적으면 돼요: {EXAMPLE_INPUT}
            </Text>
            <Button
              label="재료 추가하기"
              onPress={() => router.push({ pathname: '/(tabs)/add', params: { example: EXAMPLE_INPUT } })}
            />
          </View>
        ) : null}

        {expiringSoon.length > 0 ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-tertiary">곧 상해요 · {expiringSoon.length}개</Text>
            {expiringSoon.map(renderRow)}
          </View>
        ) : null}

        {ZONES.map((zone) =>
          byStorage[zone].length > 0 ? (
            <View key={zone} className="gap-2">
              <Text className="text-sm font-semibold text-on-surface-variant">{storageLabels[zone]}</Text>
              {byStorage[zone].map(renderRow)}
            </View>
          ) : null,
        )}
      </ScrollView>

      {pending ? (
        <View className="absolute inset-x-6 bottom-6 flex-row items-center justify-between rounded-2xl bg-on-surface px-4 py-2">
          <Text className="text-sm text-surface">{pending.name} 사용함</Text>
          <Button label="실행취소" variant="ghost" onPress={() => void undo()} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
