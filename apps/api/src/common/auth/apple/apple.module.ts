import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppleTokenClient } from './apple-token.client';

/** AppleTokenClient를 Auth/User 모듈이 순환 import 없이 공유하기 위한 모듈. */
@Module({
  imports: [ConfigModule],
  providers: [AppleTokenClient],
  exports: [AppleTokenClient],
})
export class AppleModule {}
