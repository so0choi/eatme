import { Text, View } from 'react-native';

// 임시 화면: 라우팅 가드 대상. 로그인 화면 태스크에서 교체.
export default function Login() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-on-surface">로그인</Text>
    </View>
  );
}
