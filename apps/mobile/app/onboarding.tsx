import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../src/auth/auth-context';
import { Button, Notice, Screen } from '../src/ui';

const SLIDES = [
  { title: '한 줄로 빠르게 넣어요', body: '"감자 500g 3천원"처럼 적기만 하면 이름·수량·가격을 알아서 나눠 담아요.' },
  { title: '유통기한은 자동으로', body: '재료마다 보관 위치에 맞는 유통기한을 추정해 줘요. 언제든 직접 고칠 수 있어요.' },
  { title: '버리기 전에 알려드려요', body: '유통기한 하루 전에 알림을 보내 드려요. 내 냉장고의 재료를 끝까지 쓰도록 도와요.' },
];

export default function Onboarding() {
  const router = useRouter();
  const { markOnboarded } = useAuth();
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const finish = async () => {
    setFinishing(true);
    setError(null);
    try {
      await markOnboarded();
      router.replace('/(tabs)');
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Screen>
      <View className="flex-1 justify-center gap-4">
        <Text className="text-xs font-semibold text-primary">
          {index + 1} / {SLIDES.length}
        </Text>
        <Text className="text-3xl font-bold text-on-surface">{slide.title}</Text>
        <Text className="text-base leading-6 text-on-surface-variant">{slide.body}</Text>
      </View>
      <View className="gap-2">
        {error ? <Notice message={error} /> : null}
        <Button
          label={last ? '시작하기' : '다음'}
          loading={finishing}
          onPress={last ? () => void finish() : () => setIndex(index + 1)}
        />
        {!last ? <Button label="건너뛰기" variant="ghost" onPress={() => void finish()} /> : null}
      </View>
    </Screen>
  );
}
