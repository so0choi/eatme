import { useMutation, useQuery } from '@apollo/client/react';
import { type ReactNode, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_CONFIG, DELETE_ACCOUNT, UPDATE_NOTIFICATION_SETTINGS } from '../../src/api/documents';
import { useAuth } from '../../src/auth/auth-context';
import { openPolicy } from '../../src/auth/policy-links';
import { registerForPush } from '../../src/push/register';
import { Button, Notice } from '../../src/ui';
import { colors } from '../../src/ui/colors';

const DEFAULT_PUSH_HOUR = 9;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

const hourLabel = (h: number) => (h < 12 ? `오전 ${h === 0 ? 12 : h}시` : `오후 ${h === 12 ? 12 : h - 12}시`);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-xs font-semibold text-on-surface-variant">{title}</Text>
      <View className="gap-4 rounded-3xl bg-surface-container-lowest p-5">{children}</View>
    </View>
  );
}

function Row({ label, onPress, tone = 'default' }: { label: string; onPress: () => void; tone?: 'default' | 'danger' }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center justify-between py-1 active:opacity-60">
      <Text className={`text-base ${tone === 'danger' ? 'text-error' : 'text-on-surface'}`}>{label}</Text>
      <Text className="text-base text-outline">›</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { profile, signOut, clearLocalSession, refreshProfile } = useAuth();
  const { data: configData } = useQuery(APP_CONFIG);
  const [updateSettings, { loading: savingSettings }] = useMutation(UPDATE_NOTIFICATION_SETTINGS);
  const [deleteAccount, { loading: deleting }] = useMutation(DELETE_ACCOUNT);

  const [pushEnabled, setPushEnabled] = useState(profile?.pushEnabled ?? true);
  const [pushHour, setPushHour] = useState(profile?.pushHour ?? DEFAULT_PUSH_HOUR);
  const [notice, setNotice] = useState<{ message: string; tone: 'error' | 'info' } | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setPushEnabled(profile.pushEnabled);
    setPushHour(profile.pushHour);
  }, [profile]);

  const saveSettings = async (next: { pushEnabled: boolean; pushHour: number }) => {
    const prev = { pushEnabled, pushHour };
    setPushEnabled(next.pushEnabled);
    setPushHour(next.pushHour);
    setNotice(null);
    try {
      await updateSettings({ variables: next });
      void refreshProfile();
    } catch (error) {
      console.warn('[settings] 알림 설정 저장 실패', error);
      setPushEnabled(prev.pushEnabled);
      setPushHour(prev.pushHour);
      setNotice({ message: '알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.', tone: 'error' });
      return;
    }
    if (next.pushEnabled && !prev.pushEnabled) {
      // 알림을 켜면 기기 권한도 확인한다(거부 상태면 기기 설정 안내).
      const result = await registerForPush({ requestPermission: true }).catch((error) => {
        console.warn('[settings] 푸시 등록 실패', error);
        return 'skipped' as const;
      });
      if (result === 'denied') {
        setNotice({ message: '기기 설정에서 Eat me 알림을 허용해야 알림을 받을 수 있어요.', tone: 'info' });
      }
    }
  };

  const contact = () => {
    const email = configData?.appConfig.supportEmail;
    if (!email) {
      Alert.alert('문의하기', '문의 주소를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('문의하기', `메일 앱을 열 수 없어요. ${email} 로 메일을 보내 주세요.`);
    });
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const runDelete = async () => {
    try {
      await deleteAccount();
    } catch (error) {
      console.warn('[settings] 계정 삭제 실패', error);
      Alert.alert('계정 삭제 실패', '계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    // 서버 세션이 이미 없으므로 logout 호출 없이 기기 토큰만 지운다 → 라우팅 가드가 로그인으로 보낸다.
    await clearLocalSession();
  };

  const confirmDelete = () => {
    Alert.alert('계정을 삭제할까요?', '계정과 냉장고 재료, 폐기 기록, 알림 설정이 모두 삭제돼요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '계속',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            '정말 삭제할까요?',
            '삭제는 즉시 영구적으로 처리되며 되돌릴 수 없어요. 같은 이메일로 다시 가입해도 기존 데이터는 복구되지 않아요.',
            [
              { text: '취소', style: 'cancel' },
              { text: '삭제', style: 'destructive', onPress: () => void runDelete() },
            ],
          ),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerClassName="grow gap-6 px-6 pb-28 pt-6">
        <View className="gap-1">
          <Text className="text-3xl font-bold text-on-surface">설정</Text>
          {profile ? <Text className="text-sm text-on-surface-variant">{profile.email}</Text> : null}
        </View>

        {notice ? <Notice message={notice.message} tone={notice.tone} /> : null}

        <Section title="알림">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 gap-1 pr-4">
              <Text className="text-base text-on-surface">유통기한 알림</Text>
              <Text className="text-xs text-on-surface-variant">유통기한이 하루 남은 재료를 하루 한 번 알려드려요.</Text>
            </View>
            <Switch
              accessibilityLabel="유통기한 알림"
              value={pushEnabled}
              disabled={savingSettings}
              trackColor={{ true: colors.primary }}
              onValueChange={(on) => void saveSettings({ pushEnabled: on, pushHour })}
            />
          </View>
          {pushEnabled ? (
            <View className="gap-2">
              <Text className="text-sm text-on-surface">알림 시각 · {hourLabel(pushHour)}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {HOURS.map((h) => {
                  const selected = h === pushHour;
                  return (
                    <Pressable
                      key={h}
                      accessibilityRole="button"
                      accessibilityLabel={hourLabel(h)}
                      accessibilityState={{ selected, disabled: savingSettings }}
                      disabled={savingSettings || selected}
                      onPress={() => void saveSettings({ pushEnabled, pushHour: h })}
                      className={`rounded-full px-3 py-2 ${selected ? 'bg-primary' : 'bg-surface-container'}`}
                    >
                      <Text className={`text-sm ${selected ? 'font-semibold text-on-primary' : 'text-on-surface'}`}>{h}시</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </Section>

        <Section title="정보">
          <Row label="이용약관" onPress={() => openPolicy('terms')} />
          <Row label="개인정보처리방침" onPress={() => openPolicy('privacy')} />
          <Row label="문의하기" onPress={contact} />
        </Section>

        <Section title="계정">
          <Button label="로그아웃" variant="secondary" loading={signingOut} onPress={() => void handleSignOut()} />
          <Row label={deleting ? '계정 삭제 중…' : '계정 삭제'} tone="danger" onPress={() => (deleting ? undefined : confirmDelete())} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
