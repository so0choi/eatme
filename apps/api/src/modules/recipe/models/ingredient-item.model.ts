import { Field, Int, ObjectType } from '@nestjs/graphql';
import { IngredientCategory } from '@prisma/enums';

// IngredientCategory enum은 ingredient.model.ts에서 registerEnumType으로 등록됨 (중복 등록 금지)

// 표준 재료 카탈로그 — '양파'는 여기 1행만 존재한다.
@ObjectType('IngredientItem')
export class IngredientItem {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;

  @Field(() => IngredientCategory, { nullable: true })
  category?: IngredientCategory;
}
