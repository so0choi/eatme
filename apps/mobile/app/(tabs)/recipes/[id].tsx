import { useMutation, useQuery } from '@apollo/client/react';
import { matchRecipe } from '@eatme/core';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GET_ALL_INGREDIENTS, GET_RECIPE, type Ingredient, UPDATE_INGREDIENT } from '../../../src/api/documents';
import { activeIngredients, pickIngredientsToUse } from '../../../src/recipes/cooked';
import { CookedSheet } from '../../../src/recipes/CookedSheet';
import { DIFFICULTY_LABEL, formatCookTime, formatRecipeAmount } from '../../../src/recipes/recipe-meta';
import { Button, Notice } from '../../../src/ui';
import { colors } from '../../../src/ui/colors';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Number(id);
  const recipeQuery = useQuery(GET_RECIPE, { variables: { id: recipeId }, skip: !Number.isFinite(recipeId) });
  const fridge = useQuery(GET_ALL_INGREDIENTS);
  const [updateIngredient] = useMutation(UPDATE_INGREDIENT);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const recipe = recipeQuery.data?.recipe;
  const active = useMemo(() => activeIngredients(fridge.data?.getAllIngredients ?? []), [fridge.data]);
  const match = useMemo(() => (recipe ? matchRecipe(recipe, active.map((i) => i.name)) : null), [recipe, active]);
  const candidates = useMemo(() => (recipe ? pickIngredientsToUse(recipe, active) : []), [recipe, active]);
  const optional = recipe?.ingredients.filter((i) => i.optional) ?? [];

  const confirm = async (selected: Ingredient[]) => {
    setBusy(true);
    setFailure(null);
    const results = await Promise.allSettled(
      selected.map((i) => updateIngredient({ variables: { input: { id: i.id, status: 'USED' } } })),
    );
    await fridge.refetch().catch(() => undefined);
    setBusy(false);
    setSheetOpen(false);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - ok;
    if (failed > 0) setFailure(`${failed}개 재료는 사용 처리하지 못했어요. 다시 시도해 주세요.`);
    if (ok > 0) {
      setToast(`${ok}개 재료를 사용 처리했어요`);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3000);
    }
  };

  if (recipeQuery.loading && !recipe) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (!recipe || !match) {
    return (
      <SafeAreaView className="flex-1 bg-surface px-6 py-8">
        <Notice message="레시피를 불러오지 못했어요.">
          <Button label="다시 시도" variant="secondary" onPress={() => void recipeQuery.refetch()} />
        </Notice>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerClassName="gap-5 px-6 pb-28 pt-6">
        {recipe.imageUrl ? (
          <Image source={{ uri: recipe.imageUrl }} className="h-48 w-full rounded-3xl bg-surface-container" />
        ) : null}
        <View className="gap-1">
          <Text className="text-2xl font-bold text-on-surface">{recipe.title}</Text>
          {recipe.description ? <Text className="text-sm text-on-surface-variant">{recipe.description}</Text> : null}
          <Text className="text-xs text-on-surface-variant">
            {formatCookTime(recipe.cookTime)}
            {recipe.difficulty ? ` · ${DIFFICULTY_LABEL[recipe.difficulty]}` : ''}
            {recipe.servings ? ` · ${recipe.servings}인분` : ''}
          </Text>
        </View>

        {failure ? <Notice message={failure} /> : null}

        <View className="gap-2 rounded-2xl bg-surface-container-lowest p-4">
          <Text className="text-sm font-semibold text-primary">보유 재료 · {match.have.length}개</Text>
          {match.have.length === 0 ? <Text className="text-sm text-on-surface-variant">없어요</Text> : null}
          {match.have.map((name) => (
            <Text key={name} className="text-sm text-on-surface">
              {name}
            </Text>
          ))}
        </View>

        <View className="gap-2 rounded-2xl bg-surface-container-lowest p-4">
          <Text className="text-sm font-semibold text-tertiary">부족한 재료 · {match.missing.length}개</Text>
          {match.missing.length === 0 ? <Text className="text-sm text-on-surface-variant">모두 있어요</Text> : null}
          {match.missing.map((name) => (
            <Text key={name} className="text-sm text-on-surface">
              {name}
            </Text>
          ))}
        </View>

        {optional.length > 0 ? (
          <View className="gap-2 rounded-2xl bg-surface-container-low p-4">
            <Text className="text-sm font-semibold text-on-surface-variant">선택 재료</Text>
            {optional.map((i) => (
              <Text key={i.id} className="text-sm text-on-surface-variant">
                {i.name} {formatRecipeAmount(i.quantity, i.unit)}
              </Text>
            ))}
          </View>
        ) : null}

        <View className="gap-3">
          <Text className="text-lg font-bold text-on-surface">만드는 법</Text>
          {recipe.steps.map((step, idx) => (
            <View key={idx} className="flex-row gap-3">
              <Text className="w-6 text-sm font-semibold text-primary">{idx + 1}</Text>
              <Text className="flex-1 text-sm leading-5 text-on-surface">{step}</Text>
            </View>
          ))}
        </View>

        <Button label="요리했어요" onPress={() => setSheetOpen(true)} />
      </ScrollView>

      {toast ? (
        <View className="absolute inset-x-6 bottom-6 rounded-2xl bg-on-surface px-4 py-3">
          <Text className="text-sm text-surface">{toast}</Text>
        </View>
      ) : null}

      <CookedSheet
        visible={sheetOpen}
        candidates={candidates}
        busy={busy}
        onCancel={() => setSheetOpen(false)}
        onConfirm={(sel) => void confirm(sel)}
      />
    </SafeAreaView>
  );
}
