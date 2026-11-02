import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@db/prisma.service';
import { IngredientStatus } from '@prisma/enums';
import { daysLeft } from '@eatme/core';
import {
  EXPO_PUSH_CLIENT,
  ExpoPushClient,
  ExpoPushMessage,
} from './expo-push.client';

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

@Injectable()
export class ExpiryNotificationService {
  private readonly logger = new Logger(ExpiryNotificationService.name);

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(EXPO_PUSH_CLIENT) private readonly expoPushClient: ExpoPushClient,
  ) {}

  /** 현재 KST 시(0~23). 머신 타임존과 무관. */
  private kstHour(now: Date): number {
    return new Date(now.getTime() + KST_OFFSET_MS).getUTCHours();
  }

  /** 대상 사용자에게 유통기한 요약 푸시를 하루 1건 보낸다. */
  async run(now: Date): Promise<{ sent: number }> {
    const candidates = await this.prismaService.user.findMany({
      where: { pushEnabled: true, pushHour: this.kstHour(now) },
    });
    const users = candidates.filter(
      (u) => !u.lastExpiryPushAt || daysLeft(u.lastExpiryPushAt, now) !== 0,
    );
    if (!users.length) return { sent: 0 };

    const userIds = users.map((u) => u.id);
    // 넉넉한 창으로 한 번에 조회하고 KST 달력 기준 판정은 daysLeft로 정밀하게 거른다.
    const [ingredients, tokens] = await Promise.all([
      this.prismaService.ingredient.findMany({
        where: {
          userId: { in: userIds },
          status: { in: [IngredientStatus.FRESH, IngredientStatus.EXPIRING_SOON] },
          expireAt: {
            gte: new Date(now.getTime() - DAY_MS),
            lt: new Date(now.getTime() + 3 * DAY_MS),
          },
        },
        orderBy: { expireAt: 'asc' },
      }),
      this.prismaService.pushToken.findMany({ where: { userId: { in: userIds } } }),
    ]);

    const messages: (ExpoPushMessage & { userId: number; tokenId: number })[] = [];
    const notified: number[] = [];

    for (const user of users) {
      const due = ingredients.filter(
        (i) =>
          i.userId === user.id &&
          i.expireAt &&
          [0, 1].includes(daysLeft(i.expireAt, now)),
      );
      const userTokens = tokens.filter((t) => t.userId === user.id);
      if (!due.length || !userTokens.length) continue;

      const body = this.buildBody(due, now);
      for (const t of userTokens) {
        messages.push({
          to: t.token,
          title: '유통기한 알림',
          body,
          userId: user.id,
          tokenId: t.id,
        });
      }
      notified.push(user.id);
    }
    if (!messages.length) return { sent: 0 };

    const tickets = await this.expoPushClient.send(
      messages.map(({ to, title, body }) => ({ to, title, body })),
    );

    const invalidTokenIds = messages
      .filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered')
      .map((m) => m.tokenId);
    if (invalidTokenIds.length) {
      await this.prismaService.pushToken.deleteMany({
        where: { id: { in: invalidTokenIds } },
      });
    }

    for (const id of notified) {
      await this.prismaService.user.update({
        where: { id },
        data: { lastExpiryPushAt: now },
      });
    }
    this.logger.log(`Expiry push sent — users: ${notified.length}, messages: ${messages.length}`);
    return { sent: notified.length };
  }

  private buildBody(due: { name: string; expireAt: Date | null }[], now: Date): string {
    if (due.length === 1) {
      const when = daysLeft(due[0].expireAt!, now) === 0 ? '오늘' : '내일';
      return `${due[0].name}이(가) ${when}까지예요`;
    }
    return `${due[0].name} 외 ${due.length - 1}개가 곧 만료돼요`;
  }
}
