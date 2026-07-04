import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { Strategy, Profile } from 'passport-naver-v2';
import { OAuthUser } from '../auth.service';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  private static readonly logger = new Logger(NaverStrategy.name);

  constructor(config: ConfigService) {
    const clientID = config.get<string>('NAVER_CLIENT_ID');
    const clientSecret = config.get<string>('NAVER_CLIENT_SECRET');
    const apiBaseUrl = config.get<string>('API_BASE_URL') ?? 'http://localhost:4000';

    if (!clientID || !clientSecret) {
      NaverStrategy.logger.warn(
        'NAVER_CLIENT_ID/SECRET 미설정 — 네이버 로그인은 크리덴셜 설정 전까지 동작하지 않습니다.',
      );
    }

    super({
      // 빈 문자열(.env 미입력)도 fallback 되도록 || 사용 — 미설정 시 부팅 크래시 방지.
      clientID: clientID || 'missing-naver-client-id',
      clientSecret: clientSecret || 'missing-naver-client-secret',
      callbackURL: `${apiBaseUrl}/auth/naver/callback`,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: unknown, user?: OAuthUser) => void,
  ) {
    // 네이버는 이메일 제공이 선택 동의라 없을 수 있음.
    // 없으면 네이버 고유 id 기반 placeholder 이메일로 대체해 계정을 식별한다.
    const email = profile.email ?? `naver_${profile.id}@oauth.local`;
    const oauthUser: OAuthUser = {
      email,
      name: profile.name ?? profile.nickname ?? undefined,
      provider: 'naver',
    };
    done(null, oauthUser);
  }
}
