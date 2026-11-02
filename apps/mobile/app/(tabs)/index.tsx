import { parseLine } from '@eatme/core';
import { Text, View } from 'react-native';

// 임시 화면: Metro가 workspace 패키지(@eatme/core)를 해석하는지 확인용. 냉장고 탭 태스크에서 교체.
export default function Index() {
  const parsed = parseLine('감자 500g 3천원');
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-lg font-semibold text-on-surface">{parsed.name}</Text>
    </View>
  );
}
