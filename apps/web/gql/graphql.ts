/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: any; output: any; }
};

export type Comment = {
  __typename?: 'Comment';
  author: User;
  content: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  review: Scalars['Int']['output'];
};

export type CookingShort = {
  __typename?: 'CookingShort';
  channelTitle: Scalars['String']['output'];
  publishedAt?: Maybe<Scalars['String']['output']>;
  thumbnailUrl: Scalars['String']['output'];
  title: Scalars['String']['output'];
  videoId: Scalars['String']['output'];
};

export type CreateIngredientInput = {
  category?: InputMaybe<IngredientCategory>;
  expireAt?: InputMaybe<Scalars['DateTime']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  price?: InputMaybe<Scalars['Int']['input']>;
  quantity?: InputMaybe<Scalars['Float']['input']>;
  storage: StorageType;
  unit?: InputMaybe<IngredientUnit>;
};

export type CreateRecipeInput = {
  cookTime?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<RecipeDifficulty>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  ingredients?: Array<RecipeIngredientInput>;
  servings?: InputMaybe<Scalars['Int']['input']>;
  steps?: Array<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type CreateReviewInput = {
  content: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type CreateUserInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  phone?: InputMaybe<Scalars['String']['input']>;
  preferenceTags?: InputMaybe<Array<Scalars['String']['input']>>;
  provider?: InputMaybe<Scalars['String']['input']>;
};

export type Ingredient = {
  __typename?: 'Ingredient';
  category?: Maybe<IngredientCategory>;
  createdAt: Scalars['DateTime']['output'];
  expireAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['Int']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  price?: Maybe<Scalars['Int']['output']>;
  quantity?: Maybe<Scalars['Float']['output']>;
  status: IngredientStatus;
  storage: StorageType;
  unit?: Maybe<IngredientUnit>;
  updatedAt: Scalars['DateTime']['output'];
};

export enum IngredientCategory {
  Dairy = 'DAIRY',
  Drink = 'DRINK',
  Egg = 'EGG',
  Etc = 'ETC',
  Fruit = 'FRUIT',
  Grain = 'GRAIN',
  Meat = 'MEAT',
  Sauce = 'SAUCE',
  Seafood = 'SEAFOOD',
  Snack = 'SNACK',
  Vegetable = 'VEGETABLE'
}

export type IngredientItem = {
  __typename?: 'IngredientItem';
  category?: Maybe<IngredientCategory>;
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export enum IngredientStatus {
  Discarded = 'DISCARDED',
  Expired = 'EXPIRED',
  ExpiringSoon = 'EXPIRING_SOON',
  Fresh = 'FRESH',
  Used = 'USED'
}

export enum IngredientUnit {
  Bottle = 'BOTTLE',
  Ea = 'EA',
  G = 'G',
  Kg = 'KG',
  L = 'L',
  Ml = 'ML',
  Pack = 'PACK'
}

export type LoginDto = {
  autologin?: InputMaybe<Scalars['Boolean']['input']>;
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type LoginToken = {
  __typename?: 'LoginToken';
  accessToken: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  refreshExpiresIn: Scalars['Int']['output'];
  refreshToken: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createIngredient: Ingredient;
  createRecipe: Recipe;
  createReview: Review;
  deleteIngredient: Scalars['Boolean']['output'];
  deleteRecipe: Scalars['Boolean']['output'];
  editProfile: User;
  login: LoginToken;
  logout: Scalars['Boolean']['output'];
  signup: User;
  updateIngredient: Ingredient;
  updateRecipe: Recipe;
};


export type MutationCreateIngredientArgs = {
  input: CreateIngredientInput;
};


export type MutationCreateRecipeArgs = {
  input: CreateRecipeInput;
};


export type MutationCreateReviewArgs = {
  createReviewInput: CreateReviewInput;
};


export type MutationDeleteIngredientArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteRecipeArgs = {
  id: Scalars['Int']['input'];
};


export type MutationEditProfileArgs = {
  data: UpdateDto;
};


export type MutationLoginArgs = {
  input: LoginDto;
};


export type MutationSignupArgs = {
  createUserInput: CreateUserInput;
};


export type MutationUpdateIngredientArgs = {
  input: UpdateIngredientInput;
};


export type MutationUpdateRecipeArgs = {
  input: UpdateRecipeInput;
};

export type Query = {
  __typename?: 'Query';
  cookingShorts: Array<CookingShort>;
  getAllIngredients: Array<Ingredient>;
  getAllRecipes: Array<Recipe>;
  ingredient: Ingredient;
  profile: User;
  recipe: Recipe;
};


export type QueryIngredientArgs = {
  id: Scalars['Int']['input'];
};


export type QueryRecipeArgs = {
  id: Scalars['Int']['input'];
};

export type Recipe = {
  __typename?: 'Recipe';
  authorId?: Maybe<Scalars['Int']['output']>;
  cookTime?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  difficulty?: Maybe<RecipeDifficulty>;
  id: Scalars['Int']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  ingredients: Array<RecipeIngredient>;
  servings?: Maybe<Scalars['Int']['output']>;
  steps: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export enum RecipeDifficulty {
  Easy = 'EASY',
  Hard = 'HARD',
  Medium = 'MEDIUM'
}

export type RecipeIngredient = {
  __typename?: 'RecipeIngredient';
  id: Scalars['Int']['output'];
  item: IngredientItem;
  name: Scalars['String']['output'];
  optional: Scalars['Boolean']['output'];
  quantity?: Maybe<Scalars['Float']['output']>;
  unit?: Maybe<IngredientUnit>;
};

export type RecipeIngredientInput = {
  name: Scalars['String']['input'];
  optional?: InputMaybe<Scalars['Boolean']['input']>;
  quantity?: InputMaybe<Scalars['Float']['input']>;
  unit?: InputMaybe<IngredientUnit>;
};

export type Review = {
  __typename?: 'Review';
  author: User;
  comments: Array<Comment>;
  content: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export enum StorageType {
  Freezer = 'FREEZER',
  Fridge = 'FRIDGE',
  Pantry = 'PANTRY'
}

export type UpdateDto = {
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateIngredientInput = {
  category?: InputMaybe<IngredientCategory>;
  expireAt?: InputMaybe<Scalars['DateTime']['input']>;
  id: Scalars['Int']['input'];
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Int']['input']>;
  quantity?: InputMaybe<Scalars['Float']['input']>;
  status?: InputMaybe<IngredientStatus>;
  storage?: InputMaybe<StorageType>;
  unit?: InputMaybe<IngredientUnit>;
};

export type UpdateRecipeInput = {
  cookTime?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<RecipeDifficulty>;
  id: Scalars['Int']['input'];
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  ingredients?: InputMaybe<Array<RecipeIngredientInput>>;
  servings?: InputMaybe<Scalars['Int']['input']>;
  steps?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  provider?: Maybe<Scalars['String']['output']>;
};
