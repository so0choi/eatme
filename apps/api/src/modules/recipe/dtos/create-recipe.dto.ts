import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IngredientUnit, RecipeDifficulty } from '@prisma/enums';

@InputType()
export class RecipeIngredientInput {
  @Field()
  name: string;

  @Field(() => Float, { nullable: true })
  quantity?: number;

  @Field(() => IngredientUnit, { nullable: true })
  unit?: IngredientUnit;

  @Field({ nullable: true, defaultValue: false })
  optional?: boolean;
}

@InputType()
export class CreateRecipeInput {
  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field(() => Int, { nullable: true })
  servings?: number;

  @Field(() => Int, { nullable: true })
  cookTime?: number;

  @Field(() => RecipeDifficulty, { nullable: true })
  difficulty?: RecipeDifficulty;

  @Field(() => [String], { defaultValue: [] })
  steps: string[];

  @Field(() => [RecipeIngredientInput], { defaultValue: [] })
  ingredients: RecipeIngredientInput[];
}
