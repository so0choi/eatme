import { Module } from '@nestjs/common';
import { PushTokenResolver } from './push-token.resolver';
import { PushTokenService } from './push-token.service';

@Module({
  providers: [PushTokenResolver, PushTokenService],
})
export class NotificationModule {}
