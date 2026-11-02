import { Text, View } from 'react-native';

// 임시 화면: 라우팅 가드 대상. 온보딩 태스크에서 교체.
export default function Onboarding() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-on-surface">온보딩</Text>
    </View>
  );
}
