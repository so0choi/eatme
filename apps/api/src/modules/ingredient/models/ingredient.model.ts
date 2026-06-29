import {
  Field,
  Float,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  IngredientCategory,
  IngredientStatus,
  IngredientUnit,
  StorageType,
} from '@prisma/enums';

registerEnumType(IngredientCategory, { name: 'IngredientCategory' });
registerEnumType(IngredientStatus, { name: 'IngredientStatus' });
registerEnumType(IngredientUnit, { name: 'IngredientUnit' });
registerEnumType(StorageType, { name: 'StorageType' });

@ObjectType('Ingredient')
export class Ingredient {
  @Field(() => Int)
  id: number;

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

  @Field(() => IngredientStatus)
  status: IngredientStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  imageUrl?: string;
}
