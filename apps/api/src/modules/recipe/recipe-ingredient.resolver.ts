import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { RecipeIngredient } from './models/recipe-ingredient.model';

// RecipeIngredient.name 은 참조하는 IngredientItem.name 으로 resolve 한다.
// (프론트 쿼리 `ingredients { name }` 하위호환 유지)
@Resolver(() => RecipeIngredient)
export class RecipeIngredientResolver {
  @ResolveField(() => String, { name: 'name' })
  name(@Parent() recipeIngredient: RecipeIngredient): string {
    return recipeIngredient.item?.name ?? '';
  }
}
