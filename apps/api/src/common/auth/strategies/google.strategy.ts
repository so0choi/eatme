import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { OAuthUser } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private static readonly logger = new Logger(GoogleStrategy.name);

  constructor(config: ConfigService) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET');
    const apiBaseUrl = config.get<string>('API_BASE_URL') ?? 'http://localhost:4000';

    if (!clientID || !clientSecret) {
      GoogleStrategy.logger.warn(
        'GOOGLE_CLIENT_ID/SECRET 미설정 — Google 로그인은 크리덴셜 설정 전까지 동작하지 않습니다.',
      );
    }

    super({
      // 빈 문자열(.env 미입력)도 fallback 되도록 || 사용 — 미설정 시 부팅 크래시 방지.
      clientID: clientID || 'missing-google-client-id',
      clientSecret: clientSecret || 'missing-google-client-secret',
      callbackURL: `${apiBaseUrl}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const { name, emails } = profile;
    const oauthUser: OAuthUser = {
      email: emails?.[0]?.value,
      name: name ? `${name.familyName ?? ''}${name.givenName ?? ''}`.trim() : undefined,
      provider: 'google',
    };
    done(null, oauthUser);
  }
}
