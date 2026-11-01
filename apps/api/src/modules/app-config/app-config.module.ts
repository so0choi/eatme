import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigResolver } from './app-config.resolver';

@Module({
  imports: [ConfigModule],
  providers: [AppConfigResolver],
})
export class AppConfigModule {}
