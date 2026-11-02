import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useAuth } from '../auth/auth-context';
import { Button } from '../ui';
import { registerForPush } from './register';

const PUSH_ASKED_KEY = 'eatme.pushAsked';

// 사전 안내 시트를 띄우고 사용자의 답(동의 여부)을 돌려주는 함수. PushPromptHost가 등록한다.
type PushPromptPresenter = () => Promise<boolean>;

let presenter: PushPromptPresenter | null = null;
let asking = false;

export function setPushPromptPresenter(next: PushPromptPresenter | null): void {
  presenter = next;
}

/**
 * 첫 재료 저장 직후 호출: "유통기한 하루 전에 알려드릴까요?" 시트를 기기당 1회만 띄운다.
 * 시트를 띄우는 순간 플래그를 남기고(동의/거절 무관), 동의하면 OS 권한 요청 → 토큰 등록.
 */
export async function maybeAskPushPermission(): Promise<void> {
  if (asking || !presenter) return;
  asking = true;
  try {
    if (await SecureStore.getItemAsync(PUSH_ASKED_KEY)) return;
    const { status } = await Notifications.getPermissionsAsync();
    await SecureStore.setItemAsync(PUSH_ASKED_KEY, '1');
    // 이미 허용돼 있으면 묻지 않는다(등록은 PushPromptHost의 시작 시 동기화가 맡는다).
    if (status === 'granted') return;
    const accepted = await presenter();
    if (accepted) await registerForPush({ requestPermission: true });
  } catch (error) {
    console.warn('[push] 알림 권한 안내 실패', error);
  } finally {
    asking = false;
  }
}

/** 푸시 사전 안내 시트 호스트. 루트 레이아웃(AuthProvider 안)에 한 번 마운트한다. */
export function PushPromptHost() {
  const { status } = useAuth();
  const [resolve, setResolve] = useState<((accepted: boolean) => void) | null>(null);

  useEffect(() => {
    setPushPromptPresenter(
      () => new Promise<boolean>((done) => setResolve(() => done)),
    );
    return () => setPushPromptPresenter(null);
  }, []);

  // 로그인 상태로 시작하면 이미 허용된 권한에 한해 토큰을 다시 등록한다(토큰 교체 대비, 서버 멱등).
  useEffect(() => {
    if (status !== 'signedIn') return;
    registerForPush({ requestPermission: false }).catch((error) => {
      console.warn('[push] 푸시 토큰 등록 실패', error);
    });
  }, [status]);

  const answer = (accepted: boolean) => {
    resolve?.(accepted);
    setResolve(null);
  };

  return (
    <Modal visible={resolve != null} transparent animationType="slide" onRequestClose={() => answer(false)}>
      <Pressable accessibilityLabel="닫기" className="flex-1 bg-on-surface/40" onPress={() => answer(false)} />
      <View className="gap-4 rounded-t-3xl bg-surface-container-lowest px-6 pb-10 pt-6">
        <Text className="text-xl font-bold text-on-surface">유통기한 하루 전에 알려드릴까요?</Text>
        <Text className="text-sm leading-5 text-on-surface-variant">
          유통기한이 임박한 재료가 있으면 하루에 한 번만 모아서 알려드려요. 알림 시각은 설정에서 바꿀 수 있어요.
        </Text>
        <Button label="알림 받기" onPress={() => answer(true)} />
        <Button label="나중에" variant="ghost" onPress={() => answer(false)} />
      </View>
    </Modal>
  );
}
