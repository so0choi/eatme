import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@db/prisma.service';
import { CreateIngredientInput } from './dtos/create-ingredient.dto';
import { UpdateIngredientInput } from './dtos/update-ingredient.dto';

@Injectable()
export class IngredientService {
  constructor(private readonly prismaService: PrismaService) {}

  findAllByUser = async (userId: number) => {
    return this.prismaService.ingredient.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  };

  findOne = async (id: number, userId: number) => {
    const ingredient = await this.prismaService.ingredient.findFirst({
      where: { id, userId },
    });
    if (!ingredient) {
      throw new NotFoundException('INGREDIENT_NOT_FOUND');
    }
    return ingredient;
  };

  create = async (userId: number, input: CreateIngredientInput) => {
    return this.prismaService.ingredient.create({
      data: {
        ...input,
        userId,
      },
    });
  };

  update = async (userId: number, { id, ...rest }: UpdateIngredientInput) => {
    await this.findOne(id, userId);
    return this.prismaService.ingredient.update({
      where: { id },
      data: rest,
    });
  };

  remove = async (userId: number, id: number) => {
    await this.findOne(id, userId);
    await this.prismaService.ingredient.delete({ where: { id } });
    return true;
  };
}
