import { Module } from '@nestjs/common';
import { RecipeResolver } from './recipe.resolver';
import { RecipeIngredientResolver } from './recipe-ingredient.resolver';
import { RecipeService } from './recipe.service';

@Module({
  providers: [RecipeService, RecipeResolver, RecipeIngredientResolver],
})
export class RecipeModule {}
