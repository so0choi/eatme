import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { LoginToken } from './dtos/login.dto';

const CODE_TTL_MS = 60 * 1000; // 일회용 code 유효시간 60초

type StoredEntry = {
  token: LoginToken;
  expiresAt: number;
  /** PKCE S256 challenge(모바일). 있으면 교환 시 일치하는 code_verifier가 필요하다. */
  codeChallenge?: string;
};

/** RFC 7636 code_verifier 형식: 43~128자의 unreserved 문자. */
const PKCE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;

function verifierMatches(
  verifier: string | undefined,
  challenge: string,
): boolean {
  if (!verifier || !PKCE_VERIFIER_PATTERN.test(verifier)) return false;
  const actual = Buffer.from(
    createHash('sha256').update(verifier).digest('base64url'),
  );
  const expected = Buffer.from(challenge);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

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

  issue(token: LoginToken, codeChallenge?: string): string {
    this.sweep();
    const code = randomBytes(24).toString('hex');
    this.store.set(code, {
      token,
      expiresAt: Date.now() + CODE_TTL_MS,
      codeChallenge,
    });
    return code;
  }

  /**
   * code를 토큰으로 교환한다. 시도 즉시 폐기(일회용 — 실패해도 재시도 불가).
   * 없거나 만료, 또는 PKCE challenge가 있는데 verifier가 맞지 않으면 null.
   */
  consume(code: string, codeVerifier?: string): LoginToken | null {
    const entry = this.store.get(code);
    if (!entry) return null;
    this.store.delete(code);
    if (entry.expiresAt < Date.now()) return null;
    if (
      entry.codeChallenge &&
      !verifierMatches(codeVerifier, entry.codeChallenge)
    ) {
      return null;
    }
    return entry.token;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [code, entry] of this.store) {
      if (entry.expiresAt < now) this.store.delete(code);
    }
  }
}
