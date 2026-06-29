import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { IngredientCategory, IngredientUnit, StorageType } from '@prisma/enums';

@ObjectType('IngredientDisposal')
export class IngredientDisposal {
  @Field(() => Int)
  id: number;

  @Field(() => Int, { nullable: true })
  ingredientId?: number;

  @Field()
  name: string;

  @Field(() => Int, { nullable: true })
  price?: number;

  @Field(() => Int)
  lossAmount: number;

  @Field(() => Float, { nullable: true })
  quantity?: number;

  @Field(() => IngredientUnit, { nullable: true })
  unit?: IngredientUnit;

  @Field(() => IngredientCategory, { nullable: true })
  category?: IngredientCategory;

  @Field(() => StorageType, { nullable: true })
  storage?: StorageType;

  @Field({ nullable: true })
  expireAt?: Date;

  @Field()
  discardedAt: Date;

  @Field()
  createdAt: Date;
}
