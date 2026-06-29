import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators/getCurrentUser';
import { User } from '@modules/user/models/user.model';
import { CreateIngredientInput } from './dtos/create-ingredient.dto';
import { UpdateIngredientInput } from './dtos/update-ingredient.dto';
import { Ingredient } from './models/ingredient.model';
import { IngredientService } from './ingredient.service';

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

  @Mutation(() => Boolean, { name: 'deleteIngredient' })
  async remove(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    await this.ingredientService.remove(user.id, id);
    return true;
  }
}
