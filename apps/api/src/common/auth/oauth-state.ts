import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';

export const OAUTH_CLIENTS = ['web', 'mobile'] as const;
export type OAuthClient = (typeof OAUTH_CLIENTS)[number];

// access/refresh(typ: 'access' | 'refresh')와 절대 혼용되지 않도록 별도 타입 클레임을 둔다.
// JwtStrategy는 typ !== 'access'를 거부하므로 state를 Bearer로 써도 인증되지 않는다.
const TOKEN_TYPE_OAUTH_STATE = 'oauth_state';
const OAUTH_STATE_EXPIRES_IN = '5m';

const DEFAULT_MOBILE_REDIRECT_URI = 'eatme://';

/**
 * OAuth authorize 요청의 `state`를 서명된 JWT로 만들고 콜백에서 검증한다(OAuth CSRF 방어).
 * state는 로그인을 시작한 클라이언트(web | mobile)도 실어 나른다 → 콜백 리다이렉트 대상 결정.
 */
@Injectable()
export class OAuthStateService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  sign(client: OAuthClient): string {
    return this.jwtService.sign(
      {
        typ: TOKEN_TYPE_OAUTH_STATE,
        client,
        nonce: randomBytes(16).toString('hex'),
      },
      { secret: this.secret(), expiresIn: OAUTH_STATE_EXPIRES_IN },
    );
  }

  /** 서명·만료·타입·client가 모두 유효하면 `{ client }`, 아니면 null. */
  verify(state: string | undefined): { client: OAuthClient } | null {
    if (!state) return null;
    let payload: { typ?: unknown; client?: unknown };
    try {
      payload = this.jwtService.verify(state, { secret: this.secret() });
    } catch {
      return null;
    }
    if (payload.typ !== TOKEN_TYPE_OAUTH_STATE) return null;
    if (!OAUTH_CLIENTS.includes(payload.client as OAuthClient)) return null;
    return { client: payload.client as OAuthClient };
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
