import { useQuery } from '@apollo/client/react';
import Constants from 'expo-constants';
import { type ReactNode, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_CONFIG, type AppConfig } from '../api/documents';
import { Button } from '../ui';
import { updateState } from './version';

const CURRENT_VERSION = Constants.expoConfig?.version ?? '1.0.0';

function storeUrl(config: AppConfig | undefined): string | null {
  if (!config) return null;
  return Platform.OS === 'ios' ? config.iosStoreUrl : config.androidStoreUrl;
}

function openStore(url: string | null) {
  if (!url) return;
  Linking.openURL(url).catch((error) => console.warn('[update] 스토어 열기 실패', error));
}

/**
 * 스펙 §5: 시작 시 appConfig와 앱 버전을 비교한다.
 * min 미만 → 앱 전체를 막는 강제 업데이트 화면, latest 미만 → 닫을 수 있는 1회 배너.
 * 조회 실패(오프라인 등)는 막지 않는다.
 */
export function UpdateGate({ children }: { children: ReactNode }) {
  const { data } = useQuery(APP_CONFIG);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const config = data?.appConfig;
  const state = updateState(CURRENT_VERSION, config);
  const url = storeUrl(config);

  if (state === 'force') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-surface px-8">
        <Text className="text-2xl font-bold text-on-surface">업데이트가 필요해요</Text>
        <Text className="text-center text-sm leading-5 text-on-surface-variant">
          지금 버전({CURRENT_VERSION})은 더 이상 지원하지 않아요. 최신 버전으로 업데이트한 뒤 이용해 주세요.
        </Text>
        {url ? (
          <View className="self-stretch">
            <Button label="업데이트하기" onPress={() => openStore(url)} />
          </View>
        ) : (
          <Text className="text-center text-sm text-on-surface-variant">스토어에서 Eat me를 검색해 업데이트해 주세요.</Text>
        )}
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1">
      {children}
      {state === 'suggest' && !bannerDismissed ? (
        <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 px-4" pointerEvents="box-none">
          <View className="flex-row items-center gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
            <Pressable
              accessibilityRole="button"
              className="flex-1"
              disabled={!url}
              onPress={() => openStore(url)}
            >
              <Text className="text-sm text-on-surface">
                새 버전({config?.latestVersion})이 나왔어요.{url ? ' 눌러서 업데이트하기' : ''}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="업데이트 안내 닫기" onPress={() => setBannerDismissed(true)}>
              <Text className="text-base font-semibold text-on-surface-variant">✕</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}
