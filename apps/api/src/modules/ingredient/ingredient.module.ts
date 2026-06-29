import { Module } from '@nestjs/common';
import { IngredientResolver } from './ingredient.resolver';
import { IngredientService } from './ingredient.service';
import { IngredientStatusScheduler } from './ingredient-status.scheduler';

@Module({
  providers: [IngredientService, IngredientResolver, IngredientStatusScheduler],
})
export class IngredientModule {}
