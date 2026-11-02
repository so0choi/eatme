import { Injectable } from '@nestjs/common';
import { PrismaService } from '@db/prisma.service';
import { AuthenticatedUser } from '@common/auth/strategies/jwt.strategy';
import { RegisterPushTokenArgs } from './dtos/register-push-token.dto';
import { UpdateNotificationSettingsArgs } from './dtos/update-notification-settings.dto';

@Injectable()
export class PushTokenService {
  constructor(private readonly prismaService: PrismaService) {}

  /** 현재 세션에 푸시 토큰을 연결한다. 같은 토큰이 있으면 소유 세션·유저를 옮긴다. */
  async register(
    user: AuthenticatedUser,
    { token, platform }: RegisterPushTokenArgs,
  ): Promise<void> {
    const owner = { platform, sessionId: user.sid, userId: user.id };
    await this.prismaService.pushToken.upsert({
      where: { token },
      create: { token, ...owner },
      update: owner,
    });
  }

  updateSettings(
    userId: number,
    { pushEnabled, pushHour }: UpdateNotificationSettingsArgs,
  ) {
    return this.prismaService.user.update({
      where: { id: userId },
      data: { pushEnabled, pushHour },
    });
  }
}
