import { Query, Resolver } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import { Public } from '@common/decorators/setMetadata';
import { AppConfig } from './models/app-config.model';

@Resolver(() => AppConfig)
export class AppConfigResolver {
  constructor(private config: ConfigService) {}

  // 모바일 앱이 강제 업데이트 여부 등을 판단하도록 비로그인 상태에서도 조회 가능.
  @Public()
  @Query(() => AppConfig, { name: 'appConfig' })
  appConfig(): AppConfig {
    return {
      minSupportedVersion: this.config.get('APP_MIN_VERSION') ?? '1.0.0',
      latestVersion: this.config.get('APP_LATEST_VERSION') ?? '1.0.0',
      iosStoreUrl: this.config.get('IOS_STORE_URL') ?? null,
      androidStoreUrl: this.config.get('ANDROID_STORE_URL') ?? null,
      supportEmail: this.config.get('SUPPORT_EMAIL') ?? 'support@eatme.app',
    };
  }
}
