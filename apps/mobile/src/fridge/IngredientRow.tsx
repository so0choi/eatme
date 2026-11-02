import { daysLeft } from '@eatme/core';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { Ingredient } from '../api/documents';

type Props = {
  item: Ingredient;
  onPress: () => void;
  onUse: () => void;
  onDiscard: () => void;
};

export function expiryLabel(expireAt: string | null): { text: string; urgent: boolean } {
  if (!expireAt) return { text: '유통기한 없음', urgent: false };
  const left = daysLeft(expireAt);
  if (left < 0) return { text: `${-left}일 지남`, urgent: true };
  if (left === 0) return { text: '오늘까지', urgent: true };
  return { text: `D-${left}`, urgent: left <= 3 };
}

/** 오른쪽으로 밀면 "사용함", 왼쪽으로 밀면 "폐기". */
export function IngredientRow({ item, onPress, onUse, onDiscard }: Props) {
  const ref = useRef<SwipeableMethods>(null);
  const { text, urgent } = expiryLabel(item.expireAt);
  const amount = item.quantity != null ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : null;

  return (
    <ReanimatedSwipeable
      ref={ref}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => (
        <View className="w-24 items-center justify-center rounded-2xl bg-primary">
          <Text className="font-semibold text-on-primary">사용함</Text>
        </View>
      )}
      renderRightActions={() => (
        <View className="w-24 items-center justify-center rounded-2xl bg-error">
          <Text className="font-semibold text-on-error">폐기</Text>
        </View>
      )}
      onSwipeableOpen={(direction) => {
        ref.current?.close();
        if (direction === 'left') onUse();
        else onDiscard();
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.name} ${text}`}
        onPress={onPress}
        className="flex-row items-center justify-between rounded-2xl bg-surface-container-lowest px-4 py-4"
      >
        <View className="gap-0.5">
          <Text className="text-base font-semibold text-on-surface">{item.name}</Text>
          {amount ? <Text className="text-xs text-on-surface-variant">{amount}</Text> : null}
        </View>
        <Text className={`text-sm font-semibold ${urgent ? 'text-tertiary' : 'text-on-surface-variant'}`}>{text}</Text>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
