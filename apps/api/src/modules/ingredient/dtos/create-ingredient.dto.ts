import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IngredientCategory,
  IngredientUnit,
  StorageType,
} from '@prisma/enums';

@InputType()
export class CreateIngredientInput {
  @Field()
  name: string;

  @Field(() => Int, { nullable: true })
  price?: number;

  @Field(() => Float, { nullable: true })
  quantity?: number;

  @Field(() => IngredientUnit, { nullable: true })
  unit?: IngredientUnit;

  @Field({ nullable: true })
  expireAt?: Date;

  @Field(() => IngredientCategory, { nullable: true })
  category?: IngredientCategory;

  @Field(() => StorageType)
  storage: StorageType;

  @Field({ nullable: true })
  imageUrl?: string;
}
