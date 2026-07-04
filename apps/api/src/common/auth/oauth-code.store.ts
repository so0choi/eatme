import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { LoginToken } from './dtos/login.dto';

const CODE_TTL_MS = 60 * 1000; // 일회용 code 유효시간 60초

type StoredEntry = {
  token: LoginToken;
  expiresAt: number;
};

/**
 * OAuth 콜백에서 발급한 토큰을 웹이 교환해 갈 때까지 잠시 보관하는 일회용 code 저장소.
 * 토큰을 리다이렉트 URL에 직접 노출하지 않기 위한 용도.
 *
 * NOTE: 프로세스 메모리 기반이라 단일 인스턴스에서만 유효하다.
 * API를 다중 인스턴스로 확장하면 Redis 등 공유 저장소로 교체해야 한다.
 */
@Injectable()
export class OAuthCodeStore {
  private readonly store = new Map<string, StoredEntry>();

  issue(token: LoginToken): string {
    this.sweep();
    const code = randomBytes(24).toString('hex');
    this.store.set(code, { token, expiresAt: Date.now() + CODE_TTL_MS });
    return code;
  }

  /** code를 토큰으로 교환한다. 성공 시 즉시 폐기(일회용). 없거나 만료면 null. */
  consume(code: string): LoginToken | null {
    const entry = this.store.get(code);
    if (!entry) return null;
    this.store.delete(code);
    if (entry.expiresAt < Date.now()) return null;
    return entry.token;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [code, entry] of this.store) {
      if (entry.expiresAt < now) this.store.delete(code);
    }
  }
}
