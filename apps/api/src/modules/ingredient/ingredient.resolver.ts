import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators/getCurrentUser';
import { User } from '@modules/user/models/user.model';
import { CreateIngredientInput } from './dtos/create-ingredient.dto';
import { UpdateIngredientInput } from './dtos/update-ingredient.dto';
import { Ingredient } from './models/ingredient.model';
import { IngredientService } from './ingredient.service';
import { IngredientDisposal } from './models/ingredient-disposal.model';
import { MonthlyIngredientWaste } from './models/monthly-ingredient-waste.model';

@Resolver(() => Ingredient)
export class IngredientResolver {
  constructor(private readonly ingredientService: IngredientService) {}

  @Query(() => [Ingredient], { name: 'getAllIngredients' })
  async myIngredients(@CurrentUser() user: User): Promise<Ingredient[]> {
    return this.ingredientService.findAllByUser(user.id);
  }

  @Query(() => Ingredient, { name: 'ingredient' })
  async ingredient(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: User,
  ): Promise<Ingredient> {
    return this.ingredientService.findOne(id, user.id);
  }

  @Query(() => [MonthlyIngredientWaste], { name: 'monthlyIngredientWaste' })
  async monthlyIngredientWaste(
    @CurrentUser() user: User,
    @Args('months', { type: () => Int, nullable: true, defaultValue: 6 }) months: number,
  ): Promise<MonthlyIngredientWaste[]> {
    return this.ingredientService.findMonthlyWasteByUser(user.id, months);
  }

  @Mutation(() => Ingredient, { name: 'createIngredient' })
  async create(
    @Args('input') input: CreateIngredientInput,
    @CurrentUser() user: User,
  ): Promise<Ingredient> {
    return this.ingredientService.create(user.id, input);
  }

  @Mutation(() => Ingredient, { name: 'updateIngredient' })
  async update(
    @Args('input') input: UpdateIngredientInput,
    @CurrentUser() user: User,
  ): Promise<Ingredient> {
    return this.ingredientService.update(user.id, input);
  }

  @Mutation(() => IngredientDisposal, { name: 'discardIngredient' })
  async discard(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: User,
  ): Promise<IngredientDisposal> {
    return this.ingredientService.discard(user.id, id);
  }

  @Mutation(() => Boolean, { name: 'deleteIngredient' })
  async remove(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    await this.ingredientService.remove(user.id, id);
    return true;
  }
}
