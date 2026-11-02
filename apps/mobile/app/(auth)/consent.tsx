import { Text, View } from 'react-native';

// 임시 화면: 라우팅 가드 대상. 약관 동의 화면 태스크에서 교체.
export default function Consent() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-on-surface">약관 동의</Text>
    </View>
  );
}
