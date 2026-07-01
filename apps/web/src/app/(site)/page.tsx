import HeroSection from '@/components/sections/HeroSection';
import RankingSection, { FeaturedRecipe } from '@/components/sections/RankingSection';
import CommunitySection, { CommunityPost } from '@/components/sections/CommunitySection';
import { getClient } from '@/app/ApolloClient';
import { GET_ALL_RECIPES } from '@/queries/recipe.queries';
import { Recipe, RecipeDifficulty } from 'gql/graphql';
import { pickRandom } from '@/components/recipe/recipe-match';

const heroStats = [
  { label: '관리 중인 식재료', value: '12만+' },
  { label: '제공 레시피', value: '3,200+' },
  { label: '절약된 식재료', value: '8.1K' },
  { label: '평균 유통기한 절감', value: '4.2일' },
];

const communityPosts: CommunityPost[] = [
  {
    title: '유통기한 D-3 재료로 만드는 빠른 한 끼 5선',
    author: '냉장고탐험가',
    category: '인기 레시피',
  },
  {
    title: '채소 신선하게 오래 보관하는 방법 총정리',
    author: '살림연구소',
    category: '보관 꿀팁',
  },
  {
    title: '자취생 냉장고 필수 식재료 리스트',
    author: '자취왕',
    category: '초보 가이드',
  },
];

const difficultyLabels: Record<RecipeDifficulty, string> = {
  [RecipeDifficulty.Easy]: '난이도 ★☆☆',
  [RecipeDifficulty.Medium]: '난이도 ★★☆',
  [RecipeDifficulty.Hard]: '난이도 ★★★',
};

function toFeaturedRecipe(recipe: Recipe): FeaturedRecipe {
  return {
    id: recipe.id,
    title: recipe.title,
    imageUrl: recipe.imageUrl,
    category: recipe.cookTime ? `${recipe.cookTime}분 완성` : '추천 레시피',
    description: recipe.description ?? '서버에 등록된 실제 레시피입니다.',
    difficulty: recipe.difficulty ? difficultyLabels[recipe.difficulty] : '난이도 정보 없음',
    rating: 4.8,
    reviewCount: recipe.ingredients.length,
    tags: recipe.ingredients.slice(0, 4).map((ingredient) => ingredient.name),
  };
}

async function getFeaturedRecipes() {
  try {
    const { data } = await getClient().query<{ getAllRecipes: Recipe[] }>({
      query: GET_ALL_RECIPES,
    });
    return pickRandom(data?.getAllRecipes ?? [], 3).map(toFeaturedRecipe);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featuredRecipes = await getFeaturedRecipes();

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-16">
      <HeroSection
        eyebrow="Smart Fridge Manager"
        headline="냉장고 속 재료로, 오늘의 요리를 완성하세요."
        description="식재료를 등록하면 유통기한을 알아서 관리하고, 지금 있는 재료로 만들 수 있는 레시피를 바로 추천해드려요."
        stats={heroStats}
        primaryCta={{ label: '레시피 추천 받기', href: '#recipes' }}
        secondaryCta={{ label: '냉장고 등록하기', href: '/login' }}
      />
      <RankingSection
        eyebrow="Today's Recipes"
        title="오늘의 레시피"
        description="오늘 도전해볼 만한 메뉴를 골라봤어요."
        cta={{ label: '레시피 더 보기 →', href: '/recipes' }}
        recipes={featuredRecipes}
      />
      <CommunitySection
        eyebrow="Community"
        title="냉장고 꿀팁 모음"
        ctaLabel="팁 공유하기"
        posts={communityPosts}
        spotlight={{
          eyebrow: 'Smart Management',
          title: '유통기한 걱정 없는 냉장고',
          description:
            '식재료를 등록하면 냉부가 유통기한 순으로 정리하고, 임박 식재료는 미리 알림을 보내드려요. 남은 재료로 만들 수 있는 레시피까지 자동으로 추천해드립니다.',
          bullets: [
            '유통기한 D-3 알림 자동 발송',
            '보유 식재료 기반 레시피 즉시 추천',
            '가족·룸메이트와 냉장고 공유 관리',
          ],
          cta: { label: '냉장고 관리 시작하기', href: '/login' },
        }}
      />
    </main>
  );
}
