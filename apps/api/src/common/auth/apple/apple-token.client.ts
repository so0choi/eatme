import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { importPKCS8, SignJWT } from 'jose';
import { APPLE_ISSUER, DEFAULT_APPLE_BUNDLE_ID } from './apple-identity.service';

const CLIENT_SECRET_TTL = '5m';

type AppleKeyConfig = {
  teamId: string;
  keyId: string;
  privateKey: string;
  bundleId: string;
};

/**
 * Apple 토큰 엔드포인트 클라이언트.
 * - authorizationCode → Apple refresh token 교환(계정 삭제 시 revoke용 보관)
 * - refresh token revoke
 * 키(APPLE_TEAM_ID/APPLE_KEY_ID/APPLE_PRIVATE_KEY) 미설정 시 교환은 null, revoke는 no-op(경고 로그).
 */
@Injectable()
export class AppleTokenClient {
  private readonly logger = new Logger(AppleTokenClient.name);

  constructor(private readonly configService: ConfigService) {}

  async exchangeCode(code: string): Promise<string | null> {
    const keys = this.keyConfig();
    if (!keys) {
      this.logger.warn(
        'Apple signing key is not configured; skipping authorization code exchange.',
      );
      return null;
    }
    const { data } = await axios.post<{ refresh_token?: string }>(
      `${APPLE_ISSUER}/auth/token`,
      new URLSearchParams({
        client_id: keys.bundleId,
        client_secret: await this.clientSecret(keys),
        code,
        grant_type: 'authorization_code',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    return data.refresh_token ?? null;
  }

  async revoke(refreshToken: string): Promise<void> {
    const keys = this.keyConfig();
    if (!keys) {
      this.logger.warn(
        'Apple signing key is not configured; skipping token revoke.',
      );
      return;
    }
    await axios.post(
      `${APPLE_ISSUER}/auth/revoke`,
      new URLSearchParams({
        client_id: keys.bundleId,
        client_secret: await this.clientSecret(keys),
        token: refreshToken,
        token_type_hint: 'refresh_token',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
  }

  private keyConfig(): AppleKeyConfig | null {
    const teamId = this.configService.get<string>('APPLE_TEAM_ID');
    const keyId = this.configService.get<string>('APPLE_KEY_ID');
    const privateKey = this.configService.get<string>('APPLE_PRIVATE_KEY');
    if (!teamId || !keyId || !privateKey) return null;
    return {
      teamId,
      keyId,
      // env에 한 줄로 넣은 경우 이스케이프된 개행을 복원한다.
      privateKey: privateKey.replace(/\\n/g, '\n'),
      bundleId:
        this.configService.get<string>('APPLE_BUNDLE_ID') ||
        DEFAULT_APPLE_BUNDLE_ID,
    };
  }

  /** .p8 키(ES256)로 서명한 client secret JWT. */
  private async clientSecret(keys: AppleKeyConfig): Promise<string> {
    const key = await importPKCS8(keys.privateKey, 'ES256');
    return new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keys.keyId })
      .setIssuer(keys.teamId)
      .setIssuedAt()
      .setExpirationTime(CLIENT_SECRET_TTL)
      .setAudience(APPLE_ISSUER)
      .setSubject(keys.bundleId)
      .sign(key);
  }
}
