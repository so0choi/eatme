import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators/getCurrentUser';
import { AuthenticatedUser } from '@common/auth/strategies/jwt.strategy';
import { User } from '@modules/user/models/user.model';
import { PushTokenService } from './push-token.service';
import { RegisterPushTokenArgs } from './dtos/register-push-token.dto';
import { UpdateNotificationSettingsArgs } from './dtos/update-notification-settings.dto';

@Resolver()
export class PushTokenResolver {
  constructor(private readonly pushTokenService: PushTokenService) {}

  @Mutation(() => Boolean)
  async registerPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Args() args: RegisterPushTokenArgs,
  ): Promise<boolean> {
    await this.pushTokenService.register(user, args);
    return true;
  }

  @Mutation(() => User)
  updateNotificationSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Args() args: UpdateNotificationSettingsArgs,
  ) {
    return this.pushTokenService.updateSettings(user.id, args);
  }
}
