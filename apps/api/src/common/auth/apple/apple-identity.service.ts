import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTVerifyGetKey } from 'jose';

export const APPLE_ISSUER = 'https://appleid.apple.com';
export const DEFAULT_APPLE_BUNDLE_ID = 'com.eatme.app';

/** Apple identityToken 서명 검증 키 조회기. 테스트에서 로컬 키셋으로 교체한다. */
export const APPLE_JWKS = Symbol('APPLE_JWKS');

export const appleJwksProvider = {
  provide: APPLE_JWKS,
  useFactory: (): JWTVerifyGetKey =>
    createRemoteJWKSet(new URL(`${APPLE_ISSUER}/auth/keys`)),
};

/** Sign in with Apple의 identityToken(JWT)을 검증해 계정 식별 정보를 꺼낸다. */
@Injectable()
export class AppleIdentityService {
  constructor(
    @Inject(APPLE_JWKS) private readonly jwks: JWTVerifyGetKey,
    private readonly configService: ConfigService,
  ) {}

  async verify(identityToken: string): Promise<{ sub: string; email: string }> {
    const audience =
      this.configService.get<string>('APPLE_BUNDLE_ID') ||
      DEFAULT_APPLE_BUNDLE_ID;
    try {
      // iss·aud·exp·서명을 함께 검증한다.
      const { payload } = await jwtVerify(identityToken, this.jwks, {
        issuer: APPLE_ISSUER,
        audience,
      });
      if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
        throw new Error('missing sub/email claim');
      }
      return { sub: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('INVALID_APPLE_TOKEN');
    }
  }
}
