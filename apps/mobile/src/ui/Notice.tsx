import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type NoticeProps = {
  message: string;
  tone?: 'error' | 'info';
  // 안내 아래 동작(예: 다시 시도 버튼).
  children?: ReactNode;
};

/** 인라인 안내 박스. 오류는 error-container 톤, 정보는 surface-container-low 톤. */
export function Notice({ message, tone = 'error', children }: NoticeProps) {
  const isError = tone === 'error';
  return (
    <View
      accessibilityRole="alert"
      className={`gap-3 rounded-2xl px-4 py-3 ${isError ? 'bg-error-container' : 'bg-surface-container-low'}`}
    >
      <Text className={`text-sm leading-5 ${isError ? 'text-on-error-container' : 'text-on-surface-variant'}`}>
        {message}
      </Text>
      {children}
    </View>
  );
}
