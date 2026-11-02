import { useState } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

type TextFieldProps = Omit<TextInputProps, 'className' | 'placeholderTextColor'> & {
  label: string;
  error?: string | null;
};

/** 라벨 + 입력 + 오류. 영역 구분은 배경 단계로 하고, 포커스만 primary 링으로 표시한다. */
export function TextField({ label, error, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-on-surface">{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        placeholderTextColor="#3f494880"
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        // RN에는 ring이 없어 포커스 링을 투명 테두리 ↔ primary/30 테두리로 표현한다(레이아웃 이동 없음).
        className={`rounded-xl border-2 px-4 py-3 text-base text-on-surface ${
          focused ? 'border-primary/30 bg-surface-container-low' : 'border-transparent bg-surface-container'
        }`}
      />
      {error ? <Text className="text-xs text-error">{error}</Text> : null}
    </View>
  );
}
