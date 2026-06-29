import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { IngredientUnit } from '@prisma/enums';
import { IngredientItem } from './ingredient-item.model';

// IngredientUnit enum은 ingredient.model.ts에서 registerEnumType으로 등록됨 (중복 등록 금지)

// 레시피별 재료 사용량(junction) — 표준 재료(IngredientItem)를 참조한다.
@ObjectType('RecipeIngredient')
export class RecipeIngredient {
  @Field(() => Int)
  id: number;

  // 'name' 필드는 RecipeIngredientResolver 의 @ResolveField 에서 item.name 으로 노출된다
  // (프론트 쿼리 `ingredients { name }` 하위호환). 저장 프로퍼티로는 두지 않는다.

  @Field(() => IngredientItem)
  item: IngredientItem;

  @Field(() => Float, { nullable: true })
  quantity?: number;

  @Field(() => IngredientUnit, { nullable: true })
  unit?: IngredientUnit;

  @Field()
  optional: boolean;
}
