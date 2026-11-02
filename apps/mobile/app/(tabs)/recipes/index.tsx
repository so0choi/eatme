import { useQuery } from '@apollo/client/react';
import { rankRecipes } from '@eatme/core';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GET_ALL_INGREDIENTS, GET_ALL_RECIPES } from '../../../src/api/documents';
import { activeIngredients } from '../../../src/recipes/cooked';
import { DIFFICULTY_LABEL, formatCookTime } from '../../../src/recipes/recipe-meta';
import { Button, Notice } from '../../../src/ui';
import { colors } from '../../../src/ui/colors';

export default function RecipesScreen() {
  const router = useRouter();
  const recipes = useQuery(GET_ALL_RECIPES, { notifyOnNetworkStatusChange: true });
  const fridge = useQuery(GET_ALL_INGREDIENTS);

  const ranked = useMemo(() => {
    const names = activeIngredients(fridge.data?.getAllIngredients ?? []).map((i) => i.name);
    return rankRecipes(recipes.data?.getAllRecipes ?? [], names);
  }, [recipes.data, fridge.data]);

  const refetch = () => void Promise.all([recipes.refetch(), fridge.refetch()]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        contentContainerClassName="grow gap-4 px-6 pb-28 pt-6"
        refreshControl={<RefreshControl refreshing={recipes.loading && !!recipes.data} onRefresh={refetch} />}
      >
        <Text className="text-3xl font-bold text-on-surface">레시피</Text>
        <Text className="text-sm text-on-surface-variant">내 냉장고 재료로 만들 수 있는 순서예요.</Text>

        {recipes.error || fridge.error ? (
          <Notice message="레시피를 불러오지 못했어요.">
            <Button label="다시 시도" variant="secondary" onPress={refetch} />
          </Notice>
        ) : null}
        {recipes.loading && !recipes.data ? <ActivityIndicator color={colors.primary} /> : null}
        {!recipes.loading && !recipes.error && ranked.length === 0 ? (
          <Text className="text-center text-sm text-on-surface-variant">아직 레시피가 없어요.</Text>
        ) : null}

        {ranked.map((r) => {
          const total = r.match.have.length + r.match.missing.length;
          return (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={r.title}
              onPress={() => router.push(`/recipes/${r.id}`)}
              className="flex-row gap-4 rounded-2xl bg-surface-container-lowest p-3"
            >
              {r.imageUrl ? (
                <Image source={{ uri: r.imageUrl }} className="h-20 w-20 rounded-xl bg-surface-container" />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-xl bg-surface-container">
                  <Text className="text-2xl">🍳</Text>
                </View>
              )}
              <View className="flex-1 justify-center gap-1">
                <Text numberOfLines={1} className="text-base font-semibold text-on-surface">
                  {r.title}
                </Text>
                <Text className="text-sm font-semibold text-primary">
                  재료 {r.match.have.length}/{total}개 보유
                </Text>
                <Text className="text-xs text-on-surface-variant">
                  {formatCookTime(r.cookTime)}
                  {r.difficulty ? ` · ${DIFFICULTY_LABEL[r.difficulty]}` : ''}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
