import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { RecipeDifficulty } from '@prisma/enums';
import { RecipeIngredient } from './recipe-ingredient.model';

registerEnumType(RecipeDifficulty, { name: 'RecipeDifficulty' });

@ObjectType('Recipe')
export class Recipe {
  @Field(() => Int)
  id: number;

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

  @Field(() => [String])
  steps: string[];

  @Field(() => Int, { nullable: true })
  authorId?: number;

  @Field(() => [RecipeIngredient])
  ingredients: RecipeIngredient[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
