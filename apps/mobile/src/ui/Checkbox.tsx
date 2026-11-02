import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  // 라벨 오른쪽 보조 동작(예: 약관 "보기" 링크).
  trailing?: ReactNode;
};

export function Checkbox({ checked, onChange, label, trailing }: CheckboxProps) {
  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={() => onChange(!checked)}
        className="flex-1 flex-row items-center gap-3 py-1"
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded-lg ${
            checked ? 'bg-primary' : 'bg-surface-container'
          }`}
        >
          {checked ? <Text className="text-sm font-bold text-on-primary">✓</Text> : null}
        </View>
        <Text className="flex-1 text-sm text-on-surface">{label}</Text>
      </Pressable>
      {trailing}
    </View>
  );
}
