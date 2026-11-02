import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@db/prisma.service';
import { AppleTokenClient } from '@common/auth/apple/apple-token.client';

/** 계정 즉시 삭제. 공용 레시피는 보존하고 작성자만 해제한다. */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly appleTokenClient: AppleTokenClient,
  ) {}

  async deleteAccount(userId: number): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    await this.prismaService.$transaction(async (tx) => {
      await tx.pushToken.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.ingredientDisposal.deleteMany({ where: { userId } });
      await tx.ingredient.deleteMany({ where: { userId } });
      await tx.review.deleteMany({ where: { authorId: userId } });
      await tx.recipe.updateMany({
        where: { authorId: userId },
        data: { authorId: null },
      });
      await tx.user.delete({ where: { id: userId } });
    });

    // 트랜잭션 이후 Apple 해지. 실패해도 삭제는 유지한다.
    if (user.appleRefreshToken) {
      try {
        await this.appleTokenClient.revoke(user.appleRefreshToken);
      } catch (error) {
        this.logger.error(
          `Apple token revoke failed for deleted user ${userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
