import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExpiryNotificationService } from './expiry-notification.service';

@Injectable()
export class ExpiryNotificationScheduler {
  constructor(private readonly expiryNotificationService: ExpiryNotificationService) {}

  // 매시 정각(KST) — 사용자별 pushHour와 일치하는 사람에게만 발송된다.
  @Cron('0 * * * *', { timeZone: 'Asia/Seoul' })
  async handleHourly() {
    await this.expiryNotificationService.run(new Date());
  }
}
