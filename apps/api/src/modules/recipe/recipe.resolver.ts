import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators/getCurrentUser';
import { User } from '@modules/user/models/user.model';
import { CreateRecipeInput } from './dtos/create-recipe.dto';
import { UpdateRecipeInput } from './dtos/update-recipe.dto';
import { Recipe } from './models/recipe.model';
import { RecipeService } from './recipe.service';

@Resolver(() => Recipe)
export class RecipeResolver {
  constructor(private readonly recipeService: RecipeService) {}

  @Query(() => [Recipe], { name: 'getAllRecipes' })
  async myRecipes(@CurrentUser() user: User): Promise<Recipe[]> {
    return this.recipeService.findAllByUser(user.id);
  }

  @Query(() => Recipe, { name: 'recipe' })
  async recipe(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: User,
  ): Promise<Recipe> {
    return this.recipeService.findOne(id, user.id);
  }

  @Mutation(() => Recipe, { name: 'createRecipe' })
  async create(
    @Args('input') input: CreateRecipeInput,
    @CurrentUser() user: User,
  ): Promise<Recipe> {
    return this.recipeService.create(user.id, input);
  }

  @Mutation(() => Recipe, { name: 'updateRecipe' })
  async update(
    @Args('input') input: UpdateRecipeInput,
    @CurrentUser() user: User,
  ): Promise<Recipe> {
    return this.recipeService.update(user.id, input);
  }

  @Mutation(() => Boolean, { name: 'deleteRecipe' })
  async remove(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    await this.recipeService.remove(user.id, id);
    return true;
  }
}
