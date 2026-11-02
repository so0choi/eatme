import { useApolloClient } from '@apollo/client/react';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import {
  formatPrice,
  formatQuantity,
  parseIngredientInput,
  storageLabels,
  type StorageZone,
} from '@eatme/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { CREATE_INGREDIENT, GET_ALL_INGREDIENTS, type IngredientCategory } from '../../src/api/documents';
import {
  autoCategory,
  autoStorage,
  CATEGORY_OPTIONS,
  planQuickAdd,
  type QuickAddOverrides,
  STORAGE_ZONES,
  summarizeSave,
} from '../../src/fridge/quick-add';
import { maybeAskPushPermission } from '../../src/push/ask-permission';
import { Button, Notice, Screen, ScreenHeader } from '../../src/ui';

const PLACEHOLDER = '감자, 500g, 3천원';

export default function AddScreen() {
  const router = useRouter();
  const client = useApolloClient();
  const { example } = useLocalSearchParams<{ example?: string }>();
  const [raw, setRaw] = useState('');
  const [overrides, setOverrides] = useState<QuickAddOverrides>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const prefilled = useRef<string | null>(null);

  // 빈 상태 CTA에서 넘어온 예시를 한 번만 채운다(사용자가 지운 뒤 다시 채우지 않음).
  useEffect(() => {
    if (example && prefilled.current !== example) {
      prefilled.current = example;
      setRaw(example);
    }
  }, [example]);

  const preview = useMemo(() => parseIngredientInput(raw), [raw]);

  const setStorage = (key: string, zone: StorageZone) =>
    setOverrides((prev) => ({ ...prev, storage: { ...prev.storage, [key]: zone } }));
  const setCategory = (key: string, category: IngredientCategory) =>
    setOverrides((prev) => ({ ...prev, category: { ...prev.category, [key]: category } }));

  const save = async () => {
    if (saving || preview.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      const plan = planQuickAdd(preview, overrides);
      if (plan.valid.length === 0) {
        setMessage('유효한 항목이 없어요. 형식(품목 수량 가격)을 확인해주세요.');
        return;
      }
      // 개별 저장 후 부분 실패를 감지 — 성공분은 남기고 실패분만 입력창에 돌려놓아 중복을 막는다.
      const results = await Promise.allSettled(
        plan.valid.map((v) => client.mutate({ mutation: CREATE_INGREDIENT, variables: { input: v.input } })),
      );
      const { savedCount, remainingLines, firstError } = summarizeSave(plan, results);
      if (savedCount > 0) {
        await client.refetchQueries({ include: [GET_ALL_INGREDIENTS] }).catch(() => undefined);
      }
      if (remainingLines.length === 0) {
        setRaw('');
        setOverrides({});
        void maybeAskPushPermission();
        router.navigate('/(tabs)');
        return;
      }
      setRaw(remainingLines.join('\n'));
      const serverMsg = CombinedGraphQLErrors.is(firstError) ? firstError.errors[0]?.message : undefined;
      setMessage(
        savedCount > 0
          ? `${savedCount}개 저장했어요. 나머지 ${remainingLines.length}개는 확인이 필요해요.`
          : (serverMsg ?? '재료 저장에 실패했어요. 입력을 확인해주세요.'),
      );
      if (savedCount > 0) void maybeAskPushPermission();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader eyebrow="빠른 입력" title="재료 추가" description="한 줄에 하나씩, 품목, 수량, 가격을 쉼표로 구분해요. 보관 위치는 자동으로 정해져요." />
      <View className="gap-5">
        {/* 한글 IME 조합 중 submit을 피하려고 멀티라인 입력 + 명시적 저장 버튼을 쓴다. */}
        <TextInput
          value={raw}
          onChangeText={setRaw}
          multiline
          autoCorrect={false}
          placeholder={PLACEHOLDER}
          placeholderTextColor="#3f494880"
          accessibilityLabel="빠른 입력"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          textAlignVertical="top"
          className={`min-h-28 rounded-xl border-2 px-4 py-3 text-base text-on-surface ${
            focused ? 'border-primary/30 bg-surface-container-low' : 'border-transparent bg-surface-container'
          }`}
        />

        {preview.map((item, i) => {
          const key = item.raw;
          const storage = overrides.storage?.[key] ?? autoStorage(item.name);
          const category = overrides.category?.[key] ?? autoCategory(item.name);
          const quantity = formatQuantity(item);
          const price = formatPrice(item);
          return (
            <View key={`${i}-${key}`} className="gap-3 rounded-2xl bg-surface-container-low p-4">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-base font-semibold text-on-surface">{item.name || '품목 미인식'}</Text>
                {quantity ? <Text className="rounded-full bg-secondary-fixed px-2.5 py-0.5 text-xs font-semibold text-on-secondary-fixed">{quantity}</Text> : null}
                {price ? <Text className="rounded-full bg-primary-container/25 px-2.5 py-0.5 text-xs font-semibold text-on-primary-container">{price}</Text> : null}
              </View>
              {item.issues.length > 0 ? <Text className="text-xs text-tertiary">{item.issues.join(' · ')}</Text> : null}

              <View className="flex-row gap-0.5 rounded-full bg-surface-container p-0.5">
                {STORAGE_ZONES.map((zone) => {
                  const active = zone === storage;
                  return (
                    <Pressable
                      key={zone}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`보관 ${storageLabels[zone]}`}
                      onPress={() => setStorage(key, zone)}
                      className={`flex-1 items-center rounded-full py-1.5 ${active ? 'bg-primary' : ''}`}
                    >
                      <Text className={`text-xs font-semibold ${active ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                        {storageLabels[zone]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="flex-row flex-wrap gap-1.5">
                {CATEGORY_OPTIONS.map((o) => {
                  const active = o.value === category;
                  return (
                    <Pressable
                      key={o.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`카테고리 ${o.label}`}
                      onPress={() => setCategory(key, o.value)}
                      className={`rounded-full px-2.5 py-1 ${active ? 'bg-secondary-fixed' : 'bg-surface-container'}`}
                    >
                      <Text className={`text-xs font-semibold ${active ? 'text-on-secondary-fixed' : 'text-on-surface-variant'}`}>
                        {o.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        {message ? <Notice message={message} /> : null}

        <Button
          label={saving ? '저장 중...' : `${preview.length || ''}개 재료 저장`}
          onPress={() => void save()}
          loading={saving}
          disabled={preview.length === 0}
        />
      </View>
    </Screen>
  );
}
