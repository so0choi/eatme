import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  // 폼 화면은 키보드에 가리지 않도록 스크롤 + KeyboardAvoidingView로 감싼다.
  scroll?: boolean;
};

/** 페이지 배경(surface) + 안전 영역. 디자인 토큰 레이어의 최하단. */
export function Screen({ children, scroll = false }: ScreenProps) {
  if (!scroll) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <View className="flex-1 px-6 py-8">{children}</View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          contentContainerClassName="grow px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** 화면 상단 제목 블록: eyebrow + 제목 + 설명. */
export function ScreenHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <View className="mb-8 gap-2">
      {eyebrow ? <Text className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</Text> : null}
      <Text className="text-3xl font-bold text-on-surface">{title}</Text>
      {description ? <Text className="text-sm leading-5 text-on-surface-variant">{description}</Text> : null}
    </View>
  );
}

/** 폼 패널: 페이지 배경 위로 한 단계 올라온 카드(No-Line, tonal layering). */
export function Panel({ children }: { children: ReactNode }) {
  return <View className="gap-4 rounded-3xl bg-surface-container-lowest p-6">{children}</View>;
}
