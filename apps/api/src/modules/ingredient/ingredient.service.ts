import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@db/prisma.service';
import { CreateIngredientInput } from './dtos/create-ingredient.dto';
import { UpdateIngredientInput } from './dtos/update-ingredient.dto';
import { IngredientStatus } from '@prisma/enums';

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

  findMonthlyWasteByUser = async (userId: number, months = 6) => {
    const safeMonths = Math.max(1, Math.min(months, 24));
    const now = new Date();
    const firstMonth = new Date(now.getFullYear(), now.getMonth() - safeMonths + 1, 1);

    const buckets = Array.from({ length: safeMonths }, (_, index) => {
      const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return { month, totalLoss: 0, discardedCount: 0 };
    });
    const bucketMap = new Map(buckets.map((bucket) => [bucket.month, bucket]));

    const disposals = await this.prismaService.ingredientDisposal.findMany({
      where: {
        userId,
        discardedAt: { gte: firstMonth },
      },
      select: {
        discardedAt: true,
        lossAmount: true,
      },
    });

    disposals.forEach((disposal) => {
      const discardedAt = disposal.discardedAt;
      const month = `${discardedAt.getFullYear()}-${String(discardedAt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = bucketMap.get(month);
      if (!bucket) return;
      bucket.totalLoss += disposal.lossAmount;
      bucket.discardedCount += 1;
    });

    return buckets;
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

  discard = async (userId: number, id: number) => {
    const ingredient = await this.findOne(id, userId);
    if (ingredient.status === IngredientStatus.DISCARDED) {
      throw new BadRequestException('INGREDIENT_ALREADY_DISCARDED');
    }

    return this.prismaService.$transaction(async (tx) => {
      const disposal = await tx.ingredientDisposal.create({
        data: {
          userId,
          ingredientId: ingredient.id,
          name: ingredient.name,
          price: ingredient.price,
          lossAmount: ingredient.price ?? 0,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          category: ingredient.category,
          storage: ingredient.storage,
          expireAt: ingredient.expireAt,
        },
      });

      await tx.ingredient.update({
        where: { id },
        data: { status: IngredientStatus.DISCARDED },
      });

      return disposal;
    });
  };

  remove = async (userId: number, id: number) => {
    await this.findOne(id, userId);
    await this.prismaService.ingredient.delete({ where: { id } });
    return true;
  };
}
