import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@db/prisma.service';
import {
  CreateRecipeInput,
  RecipeIngredientInput,
} from './dtos/create-recipe.dto';
import { UpdateRecipeInput } from './dtos/update-recipe.dto';

// 재료명을 표준 카탈로그(IngredientItem)에 연결하거나 없으면 생성하는 nested create 매핑
const toIngredientCreate = (ingredients: RecipeIngredientInput[]) =>
  ingredients.map(({ name, quantity, unit, optional }) => ({
    quantity,
    unit,
    optional: optional ?? false,
    item: {
      connectOrCreate: {
        where: { name },
        create: { name },
      },
    },
  }));

const includeIngredients = {
  ingredients: { include: { item: true } },
} as const;

@Injectable()
export class RecipeService {
  constructor(private readonly prismaService: PrismaService) {}

  findAllByUser = async (userId: number) => {
    return this.prismaService.recipe.findMany({
      // 시스템 공개 레시피(authorId=null) + 내가 만든 레시피
      where: { OR: [{ authorId: null }, { authorId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: includeIngredients,
    });
  };

  findOne = async (id: number, userId: number) => {
    const recipe = await this.prismaService.recipe.findFirst({
      where: { id, OR: [{ authorId: null }, { authorId: userId }] },
      include: includeIngredients,
    });
    if (!recipe) {
      throw new NotFoundException('RECIPE_NOT_FOUND');
    }
    return recipe;
  };

  create = async (userId: number, input: CreateRecipeInput) => {
    const { ingredients, ...rest } = input;
    return this.prismaService.recipe.create({
      data: {
        ...rest,
        authorId: userId,
        ingredients: { create: toIngredientCreate(ingredients) },
      },
      include: includeIngredients,
    });
  };

  update = async (
    userId: number,
    { id, ingredients, ...rest }: UpdateRecipeInput,
  ) => {
    await this.findOne(id, userId);
    return this.prismaService.recipe.update({
      where: { id },
      data: {
        ...rest,
        // ingredients가 전달된 경우에만 전체 교체(replace) 전략 적용
        ...(ingredients !== undefined && {
          ingredients: {
            deleteMany: {},
            create: toIngredientCreate(ingredients),
          },
        }),
      },
      include: includeIngredients,
    });
  };

  remove = async (userId: number, id: number) => {
    await this.findOne(id, userId);
    // RecipeIngredient는 onDelete: Cascade로 함께 삭제됨
    await this.prismaService.recipe.delete({ where: { id } });
    return true;
  };
}
