import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@db/prisma.service';
import { IngredientStatus } from '@prisma/enums';

// 곧 만료(EXPIRING_SOON)로 보는 잔여 기간(일). 프론트 기준(daysLeft <= 3)과 일치.
const EXPIRING_SOON_DAYS = 3;

@Injectable()
export class IngredientStatusScheduler implements OnModuleInit {
  private readonly logger = new Logger(IngredientStatusScheduler.name);

  constructor(private readonly prismaService: PrismaService) {}

  // 부팅 직후 1회 동기화 — 자정까지 기다리지 않고 stale 상태를 즉시 보정한다.
  async onModuleInit() {
    await this.refreshStatuses();
  }

  // 매일 자정(한국 시간) 실행 — 배포 환경 타임존(UTC 등)과 무관하게 KST 기준 고정
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'Asia/Seoul' })
  async handleDailyRefresh() {
    await this.refreshStatuses();
  }

  /**
   * expireAt 기준으로 Ingredient.status를 일괄 갱신한다.
   * - 사용자가 직접 처리한 USED / DISCARDED는 건드리지 않는다.
   * - expireAt이 없는(null) 재료는 판단 불가하므로 제외된다.
   */
  async refreshStatuses() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // EXPIRING_SOON 상한(미만) = 오늘 0시 + (3+1)일 → 오늘·+1·+2·+3일 만료를 포함
    const soonThreshold = new Date(startOfToday);
    soonThreshold.setDate(soonThreshold.getDate() + EXPIRING_SOON_DAYS + 1);

    const manualStatuses: IngredientStatus[] = [
      IngredientStatus.USED,
      IngredientStatus.DISCARDED,
    ];

    const [expired, expiringSoon, fresh] = await this.prismaService.$transaction([
      // 이미 지난 것 → EXPIRED
      this.prismaService.ingredient.updateMany({
        where: {
          expireAt: { lt: startOfToday },
          status: { notIn: [...manualStatuses, IngredientStatus.EXPIRED] },
        },
        data: { status: IngredientStatus.EXPIRED },
      }),
      // 오늘 ~ +3일 이내 만료 → EXPIRING_SOON
      this.prismaService.ingredient.updateMany({
        where: {
          expireAt: { gte: startOfToday, lt: soonThreshold },
          status: { notIn: [...manualStatuses, IngredientStatus.EXPIRING_SOON] },
        },
        data: { status: IngredientStatus.EXPIRING_SOON },
      }),
      // 그 외(여유 있음) → FRESH
      this.prismaService.ingredient.updateMany({
        where: {
          expireAt: { gte: soonThreshold },
          status: { notIn: [...manualStatuses, IngredientStatus.FRESH] },
        },
        data: { status: IngredientStatus.FRESH },
      }),
    ]);

    this.logger.log(
      `Ingredient status refreshed — EXPIRED: ${expired.count}, EXPIRING_SOON: ${expiringSoon.count}, FRESH: ${fresh.count}`,
    );
  }
}
