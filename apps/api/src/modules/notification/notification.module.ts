import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EXPO_PUSH_CLIENT, ExpoPushHttpClient } from './expo-push.client';
import { ExpiryNotificationScheduler } from './expiry-notification.scheduler';
import { ExpiryNotificationService } from './expiry-notification.service';
import { PushTokenResolver } from './push-token.resolver';
import { PushTokenService } from './push-token.service';

@Module({
  imports: [ConfigModule],
  providers: [
    PushTokenResolver,
    PushTokenService,
    ExpiryNotificationService,
    ExpiryNotificationScheduler,
    { provide: EXPO_PUSH_CLIENT, useClass: ExpoPushHttpClient },
  ],
})
export class NotificationModule {}
