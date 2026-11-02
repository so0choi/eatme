import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apolloClient } from '../api/client';
import { REGISTER_PUSH_TOKEN } from '../api/documents';

export type PushRegistrationResult = 'registered' | 'denied' | 'skipped';

function easProjectId(): string | undefined {
  const fromConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
    ?.projectId;
  return fromConfig ?? Constants.easConfig?.projectId;
}

/**
 * 푸시 권한을 확인(필요하면 요청)하고 Expo 푸시 토큰을 현재 세션에 등록한다.
 * 서버 등록은 멱등이라 앱 시작 때마다 호출해도 된다(토큰 교체 대비).
 */
export async function registerForPush({
  requestPermission,
}: {
  requestPermission: boolean;
}): Promise<PushRegistrationResult> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return 'skipped';

  // Android 13+는 채널이 있어야 권한 프롬프트가 뜬다.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '유통기한 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    if (!requestPermission) return 'denied';
    ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return 'denied';
  }

  const projectId = easProjectId();
  if (!projectId) {
    console.warn('[push] EAS projectId가 없어 푸시 토큰 등록을 건너뜁니다.');
    return 'skipped';
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await apolloClient.mutate({
    mutation: REGISTER_PUSH_TOKEN,
    variables: { token, platform: Platform.OS },
  });
  return 'registered';
}
