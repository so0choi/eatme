import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export const OAUTH_CLIENTS = ['web', 'mobile'] as const;
export type OAuthClient = (typeof OAUTH_CLIENTS)[number];

/** 모바일 진입 시 앱이 알려주는 기기 플랫폼(세션 platform으로 쓰인다). */
export const MOBILE_PLATFORMS = ['ios', 'android'] as const;
export type MobilePlatform = (typeof MOBILE_PLATFORMS)[number];

// access/refresh(typ: 'access' | 'refresh')와 절대 혼용되지 않도록 별도 타입 클레임을 둔다.
// JwtStrategy는 typ !== 'access'를 거부하므로 state를 Bearer로 써도 인증되지 않는다.
const TOKEN_TYPE_OAUTH_STATE = 'oauth_state';
const OAUTH_STATE_TTL_SECONDS = 60 * 5;

/** 로그인을 시작한 브라우저에 심는 nonce 쿠키. state JWT에는 이 값의 SHA-256만 싣는다. */
export const OAUTH_NONCE_COOKIE = 'oauth_nonce';
const OAUTH_NONCE_COOKIE_PATH = '/auth';

/** PKCE S256 code_challenge 형식(base64url(SHA-256) = 43자). */
export const PKCE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const DEFAULT_MOBILE_REDIRECT_URI = 'eatme://';

export interface OAuthStateClaims {
  client: OAuthClient;
  /** mobile 전용 PKCE S256 challenge. */
  codeChallenge?: string;
  /** mobile 전용 기기 플랫폼(앱이 보낸 경우만). */
  platform?: MobilePlatform;
}

function sha256Base64Url(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** raw `cookie` 요청 헤더에서 이름이 일치하는 쿠키 값을 꺼낸다. */
export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return undefined;
}

/**
 * OAuth authorize 요청의 `state`를 서명된 JWT로 만들고 콜백에서 검증한다(OAuth CSRF / login-CSRF 방어).
 * - state는 5분 만료, `{ client, nonceHash, codeChallenge? }`를 싣는다.
 * - nonce 원문은 시작한 브라우저의 httpOnly 쿠키(`oauth_nonce`)에만 있다 → 공격자가 직접 발급받은
 *   state+code를 피해자에게 전달해도 피해자 브라우저엔 맞는 쿠키가 없어 거부된다.
 */
@Injectable()
export class OAuthStateService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** state JWT와, 브라우저 쿠키에 심을 nonce 원문을 만든다. */
  sign(
    client: OAuthClient,
    codeChallenge?: string,
    platform?: MobilePlatform,
  ): { state: string; nonce: string } {
    const nonce = randomBytes(32).toString('base64url');
    const state = this.jwtService.sign(
      {
        typ: TOKEN_TYPE_OAUTH_STATE,
        client,
        nonceHash: sha256Base64Url(nonce),
        ...(codeChallenge ? { codeChallenge } : {}),
        ...(platform ? { platform } : {}),
      },
      { secret: this.secret(), expiresIn: OAUTH_STATE_TTL_SECONDS },
    );
    return { state, nonce };
  }

  /**
   * state 서명·만료·타입·client를 검증하고, `cookieHeader`의 nonce 쿠키가 state의 nonceHash와
   * 일치하는지 확인한다. 하나라도 어긋나면 null.
   */
  verifyWithCookie(
    state: string | undefined,
    cookieHeader: string | undefined,
  ): OAuthStateClaims | null {
    if (!state) return null;
    let payload: {
      typ?: unknown;
      client?: unknown;
      nonceHash?: unknown;
      codeChallenge?: unknown;
      platform?: unknown;
    };
    try {
      payload = this.jwtService.verify(state, { secret: this.secret() });
    } catch {
      return null;
    }
    if (payload.typ !== TOKEN_TYPE_OAUTH_STATE) return null;
    const client = payload.client as OAuthClient;
    if (!OAUTH_CLIENTS.includes(client)) return null;

    const nonce = readCookie(cookieHeader, OAUTH_NONCE_COOKIE);
    if (!nonce || typeof payload.nonceHash !== 'string') return null;
    if (!safeEqual(sha256Base64Url(nonce), payload.nonceHash)) return null;

    if (client === 'mobile') {
      // 모바일은 PKCE 필수: challenge 없는 mobile state는 받지 않는다.
      if (
        typeof payload.codeChallenge !== 'string' ||
        !PKCE_CHALLENGE_PATTERN.test(payload.codeChallenge)
      ) {
        return null;
      }
      const platform = MOBILE_PLATFORMS.find((p) => p === payload.platform);
      return {
        client,
        codeChallenge: payload.codeChallenge,
        ...(platform ? { platform } : {}),
      };
    }
    return { client };
  }

  /** 진입 응답에 붙일 nonce 쿠키(Set-Cookie 값). */
  nonceCookie(nonce: string): string {
    return this.cookie(
      `${OAUTH_NONCE_COOKIE}=${encodeURIComponent(nonce)}`,
      OAUTH_STATE_TTL_SECONDS,
    );
  }

  /** 콜백 응답에서 nonce 쿠키를 지우는 Set-Cookie 값(일회용). */
  clearNonceCookie(): string {
    return this.cookie(`${OAUTH_NONCE_COOKIE}=`, 0);
  }

  private cookie(pair: string, maxAge: number): string {
    const apiBaseUrl = this.config.get<string>('API_BASE_URL') ?? '';
    const attrs = [
      pair,
      `Path=${OAUTH_NONCE_COOKIE_PATH}`,
      `Max-Age=${maxAge}`,
      'HttpOnly',
      'SameSite=Lax',
    ];
    if (apiBaseUrl.startsWith('https://')) attrs.push('Secure');
    return attrs.join('; ');
  }

  private secret(): string | undefined {
    return this.config.get<string>('JWT_SECRET');
  }
}

export type PostLoginOutcome =
  | { kind: 'authenticated'; provider: string; code: string }
  | { kind: 'link_required'; provider: string; ticket: string }
  | { kind: 'error'; error: string };

export interface PostLoginRedirectBases {
  webBaseUrl: string;
  /** 앱 딥링크 prefix(끝에 경로 구분자 포함, 예: `eatme://`). 미설정 시 `eatme://`. */
  mobileRedirectUri?: string;
}

/** 소셜 로그인 처리 결과를 클라이언트별 리다이렉트 URL로 바꾼다. */
export function buildPostLoginRedirect(
  outcome: PostLoginOutcome,
  client: OAuthClient,
  bases: PostLoginRedirectBases,
): string {
  const query = (params: Record<string, string>) =>
    new URLSearchParams(params).toString();

  if (client === 'mobile') {
    const base = bases.mobileRedirectUri || DEFAULT_MOBILE_REDIRECT_URI;
    switch (outcome.kind) {
      case 'authenticated':
        return `${base}auth/callback?${query({ code: outcome.code })}`;
      case 'link_required':
        return `${base}link?${query({ ticket: outcome.ticket, provider: outcome.provider })}`;
      case 'error':
        return `${base}auth/callback?${query({ error: outcome.error })}`;
    }
  }

  const web = bases.webBaseUrl;
  switch (outcome.kind) {
    case 'authenticated':
      return `${web}/auth/${outcome.provider}/callback?${query({ code: outcome.code })}`;
    case 'link_required':
      return `${web}/link?${query({ ticket: outcome.ticket, provider: outcome.provider })}`;
    case 'error':
      return `${web}/login?${query({ error: outcome.error })}`;
  }
}
