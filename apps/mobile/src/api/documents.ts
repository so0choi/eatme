import { gql, type TypedDocumentNode } from '@apollo/client';
import type { LoginToken } from '../auth/token-store';
import type { CreateIngredientInput } from '../fridge/quick-add';

// codegen은 API 서버가 떠 있어야 해서 모바일은 결과 타입을 수동으로 정의한다.

export type Platform = 'ios' | 'android';

export type Profile = {
  id: string;
  email: string;
  name: string;
  termsAgreedAt: string | null;
  termsVersion: string | null;
  pushEnabled: boolean;
  pushHour: number;
};

export type AppConfig = {
  minSupportedVersion: string;
  latestVersion: string;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
  supportEmail: string;
};

const LOGIN_TOKEN_FIELDS = `
  accessToken
  refreshToken
  expiresIn
  refreshExpiresIn
`;

export const LOGIN: TypedDocumentNode<
  { login: LoginToken },
  { input: { email: string; password: string; platform: Platform } }
> = gql`
  mutation Login($input: LoginDto!) {
    login(input: $input) {
      ${LOGIN_TOKEN_FIELDS}
    }
  }
`;

// 갱신 링크를 거치지 않도록 client.ts에서 fetch로 직접 보낸다(문자열 그대로 사용).
export const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      ${LOGIN_TOKEN_FIELDS}
    }
  }
`;

export const PROFILE: TypedDocumentNode<{ profile: Profile }, Record<string, never>> = gql`
  query Profile {
    profile {
      id
      email
      name
      termsAgreedAt
      termsVersion
      pushEnabled
      pushHour
    }
  }
`;

// 로그아웃도 갱신 링크를 거치지 않고 client.ts에서 fetch로 보낸다(보낼 시점의 최신 토큰 사용).
export const LOGOUT_MUTATION = `
  mutation Logout($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`;

export const APP_CONFIG: TypedDocumentNode<{ appConfig: AppConfig }, Record<string, never>> = gql`
  query AppConfig {
    appConfig {
      minSupportedVersion
      latestVersion
      iosStoreUrl
      androidStoreUrl
      supportEmail
    }
  }
`;

export const SIGNUP: TypedDocumentNode<
  { signup: { id: string } },
  { createUserInput: { email: string; password: string; name: string; agreeTerms: true } }
> = gql`
  mutation Signup($createUserInput: CreateUserInput!) {
    signup(createUserInput: $createUserInput) {
      id
    }
  }
`;

export const EXCHANGE_OAUTH_CODE: TypedDocumentNode<
  { exchangeOAuthCode: LoginToken },
  { code: string; codeVerifier?: string | null }
> = gql`
  mutation ExchangeOAuthCode($code: String!, $codeVerifier: String) {
    exchangeOAuthCode(code: $code, codeVerifier: $codeVerifier) {
      ${LOGIN_TOKEN_FIELDS}
    }
  }
`;

export const LINK_SOCIAL_ACCOUNT: TypedDocumentNode<
  { linkSocialAccount: LoginToken },
  { ticket: string; password: string }
> = gql`
  mutation LinkSocialAccount($ticket: String!, $password: String!) {
    linkSocialAccount(ticket: $ticket, password: $password) {
      ${LOGIN_TOKEN_FIELDS}
    }
  }
`;

export type AppleLoginResult = {
  token: LoginToken | null;
  linkTicket: string | null;
  provider: string | null;
};

export const APPLE_LOGIN: TypedDocumentNode<
  { appleLogin: AppleLoginResult },
  {
    input: {
      identityToken: string;
      authorizationCode: string;
      name?: string | null;
      platform: 'ios';
    };
  }
> = gql`
  mutation AppleLogin($input: AppleLoginInput!) {
    appleLogin(input: $input) {
      token {
        ${LOGIN_TOKEN_FIELDS}
      }
      linkTicket
      provider
    }
  }
`;

export const AGREE_TERMS: TypedDocumentNode<
  { agreeTerms: { id: string; termsAgreedAt: string | null; termsVersion: string | null } },
  Record<string, never>
> = gql`
  mutation AgreeTerms {
    agreeTerms {
      id
      termsAgreedAt
      termsVersion
    }
  }
`;

export type StorageType = 'FRIDGE' | 'FREEZER' | 'PANTRY';
export type IngredientStatus = 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED' | 'USED' | 'DISCARDED';
export type IngredientUnit = 'EA' | 'G' | 'KG' | 'ML' | 'L';
export type IngredientCategory =
  | 'MEAT'
  | 'SEAFOOD'
  | 'VEGETABLE'
  | 'FRUIT'
  | 'DAIRY'
  | 'EGG'
  | 'GRAIN'
  | 'SAUCE'
  | 'DRINK'
  | 'SNACK'
  | 'ETC';

export type Ingredient = {
  id: number;
  name: string;
  price: number | null;
  quantity: number | null;
  unit: IngredientUnit | null;
  expireAt: string | null;
  storage: StorageType;
  status: IngredientStatus;
  category: IngredientCategory | null;
  imageUrl: string | null;
  createdAt: string;
};

export type UpdateIngredientInput = {
  id: number;
  name?: string;
  price?: number | null;
  quantity?: number | null;
  unit?: IngredientUnit | null;
  expireAt?: string | null;
  category?: IngredientCategory | null;
  storage?: StorageType;
  status?: IngredientStatus;
};

const INGREDIENT_FIELDS = `
  id
  name
  price
  quantity
  unit
  expireAt
  storage
  status
  category
  imageUrl
  createdAt
`;

export const GET_ALL_INGREDIENTS: TypedDocumentNode<{ getAllIngredients: Ingredient[] }, Record<string, never>> = gql`
  query GetAllIngredients {
    getAllIngredients {
      ${INGREDIENT_FIELDS}
    }
  }
`;

export const GET_INGREDIENT: TypedDocumentNode<{ ingredient: Ingredient }, { id: number }> = gql`
  query Ingredient($id: Int!) {
    ingredient(id: $id) {
      ${INGREDIENT_FIELDS}
    }
  }
`;

export const UPDATE_INGREDIENT: TypedDocumentNode<
  { updateIngredient: Ingredient },
  { input: UpdateIngredientInput }
> = gql`
  mutation UpdateIngredient($input: UpdateIngredientInput!) {
    updateIngredient(input: $input) {
      ${INGREDIENT_FIELDS}
    }
  }
`;

export const DISCARD_INGREDIENT: TypedDocumentNode<
  { discardIngredient: { id: number; lossAmount: number } },
  { id: number }
> = gql`
  mutation DiscardIngredient($id: Int!) {
    discardIngredient(id: $id) {
      id
      lossAmount
    }
  }
`;

export const DELETE_INGREDIENT: TypedDocumentNode<{ deleteIngredient: boolean }, { id: number }> = gql`
  mutation DeleteIngredient($id: Int!) {
    deleteIngredient(id: $id)
  }
`;

export const CREATE_INGREDIENT: TypedDocumentNode<
  { createIngredient: { id: number; name: string } },
  { input: CreateIngredientInput }
> = gql`
  mutation CreateIngredient($input: CreateIngredientInput!) {
    createIngredient(input: $input) {
      id
      name
    }
  }
`;

export type RecipeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type RecipeIngredientRow = {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  optional: boolean | null;
};

export type RecipeSummary = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  servings: number | null;
  cookTime: number | null;
  difficulty: RecipeDifficulty | null;
  ingredients: RecipeIngredientRow[];
};

export type RecipeDetail = RecipeSummary & { steps: string[] };

const RECIPE_FIELDS = `
  id
  title
  description
  imageUrl
  servings
  cookTime
  difficulty
  ingredients {
    id
    name
    quantity
    unit
    optional
  }
`;

export const GET_ALL_RECIPES: TypedDocumentNode<{ getAllRecipes: RecipeSummary[] }, Record<string, never>> = gql`
  query AllRecipes {
    getAllRecipes {
      ${RECIPE_FIELDS}
    }
  }
`;

export const GET_RECIPE: TypedDocumentNode<{ recipe: RecipeDetail }, { id: number }> = gql`
  query Recipe($id: Int!) {
    recipe(id: $id) {
      ${RECIPE_FIELDS}
      steps
    }
  }
`;

export type MonthlyWaste = { month: string; totalLoss: number; discardedCount: number };

export const MONTHLY_INGREDIENT_WASTE: TypedDocumentNode<
  { monthlyIngredientWaste: MonthlyWaste[] },
  { months?: number | null }
> = gql`
  query MonthlyIngredientWaste($months: Int) {
    monthlyIngredientWaste(months: $months) {
      month
      totalLoss
      discardedCount
    }
  }
`;
