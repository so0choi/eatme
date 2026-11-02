import { useQuery } from '@apollo/client/react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MONTHLY_INGREDIENT_WASTE } from '../../src/api/documents';
import { Button, Notice } from '../../src/ui';
import { colors } from '../../src/ui/colors';

const MONTHS = 6;
const BAR_MAX_HEIGHT = 120;

const won = (n: number) => `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}원`;
// "2026-11" -> "11월"
const monthLabel = (m: string) => `${Number(m.split('-')[1])}월`;

export default function InsightsScreen() {
  const { data, loading, error, refetch } = useQuery(MONTHLY_INGREDIENT_WASTE, {
    variables: { months: MONTHS },
    notifyOnNetworkStatusChange: true,
  });
  const rows = data?.monthlyIngredientWaste ?? [];
  const max = Math.max(0, ...rows.map((r) => r.totalLoss));
  const totalLoss = rows.reduce((sum, r) => sum + r.totalLoss, 0);
  const totalCount = rows.reduce((sum, r) => sum + r.discardedCount, 0);
  const isEmpty = !!data && rows.every((r) => r.totalLoss === 0 && r.discardedCount === 0);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        contentContainerClassName="grow gap-6 px-6 pb-28 pt-6"
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => void refetch()} />}
      >
        <Text className="text-3xl font-bold text-on-surface">폐기 인사이트</Text>
        {error ? (
          <Notice message="폐기 내역을 불러오지 못했어요.">
            <Button label="다시 시도" variant="secondary" onPress={() => void refetch()} />
          </Notice>
        ) : null}
        {loading && !data ? <ActivityIndicator color={colors.primary} /> : null}

        {isEmpty ? (
          <View className="items-center gap-2 rounded-3xl bg-surface-container-lowest p-8">
            <Text className="text-lg font-bold text-on-surface">최근 {MONTHS}개월간 폐기한 재료가 없어요</Text>
            <Text className="text-center text-sm text-on-surface-variant">
              유통기한 전에 잘 사용하고 계세요. 계속 이렇게 관리해 보세요.
            </Text>
          </View>
        ) : null}

        {data && !isEmpty ? (
          <>
            <View className="gap-1 rounded-3xl bg-surface-container-lowest p-6">
              <Text className="text-sm text-on-surface-variant">최근 {MONTHS}개월 폐기 손실</Text>
              <Text className="text-3xl font-bold text-tertiary">{won(totalLoss)}</Text>
              <Text className="text-sm text-on-surface-variant">폐기 {totalCount}건</Text>
            </View>

            <View className="gap-3 rounded-3xl bg-surface-container-lowest p-6">
              <View className="flex-row items-end justify-between" style={{ height: BAR_MAX_HEIGHT + 56 }}>
                {rows.map((r) => {
                  const h = max > 0 ? Math.max(r.totalLoss > 0 ? 4 : 0, Math.round((r.totalLoss / max) * BAR_MAX_HEIGHT)) : 0;
                  return (
                    <View
                      key={r.month}
                      accessible
                      accessibilityLabel={`${monthLabel(r.month)} ${won(r.totalLoss)}, ${r.discardedCount}건`}
                      className="flex-1 items-center justify-end gap-1"
                    >
                      <Text className="text-[10px] text-on-surface-variant">{r.totalLoss > 0 ? won(r.totalLoss) : ''}</Text>
                      <View style={{ height: h }} className="w-6 rounded-t-lg bg-tertiary" />
                      <Text className="text-xs font-semibold text-on-surface">{monthLabel(r.month)}</Text>
                      <Text className="text-[10px] text-on-surface-variant">{r.discardedCount}건</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
