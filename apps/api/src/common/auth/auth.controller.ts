import {
  Controller,
  Get,
  Query,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService, OAuthUser } from './auth.service';
import { OAuthCodeStore } from './oauth-code.store';
import { SocialLinkStore } from './social-link.store';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { NaverOauthGuard } from './guards/naver-oauth.guard';
import { getOAuthCallbackContext } from './guards/oauth-callback.guard';
import { Public } from '@common/decorators/setMetadata';
import {
  buildPostLoginRedirect,
  OAuthStateClaims,
  OAuthStateService,
  PostLoginOutcome,
  PostLoginRedirectBases,
} from './oauth-state';
import { OAuthEntryQueryDto } from './dtos/oauth-entry.dto';

type OAuthProvider = 'naver' | 'google';

// Nest가 관리하는 @Redirect를 사용한다. @Res(library-specific 모드)는 전역 인터셉터와
// 함께 쓰면 Fastify에서 응답이 플러시되지 않을 수 있어 리다이렉트가 나가지 않는다.
type RedirectResult = { url: string; statusCode: number };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly codeStore: OAuthCodeStore,
    private readonly linkStore: SocialLinkStore,
    private readonly config: ConfigService,
    private readonly stateService: OAuthStateService,
  ) {}

  // --- 진입 (authorize 리다이렉트) ---
  // passport의 authorize 리다이렉트는 res.setHeader/res.end(Express 스타일)에 의존하는데
  // FastifyReply엔 해당 메서드가 없어 동작하지 않는다. 따라서 진입 단계는 passport 가드 대신
  // authorize URL을 직접 만들어 리다이렉트한다. (콜백은 passport 가드가 처리)
  // nonce 쿠키는 @Res({ passthrough: true })로 헤더만 붙이고, 응답은 @Redirect가 보낸다.
  @Public()
  @Get('google')
  @Redirect()
  googleAuth(
    @Query() query: OAuthEntryQueryDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): RedirectResult {
    return this.startOAuth('google', query, reply);
  }

  @Public()
  @Get('naver')
  @Redirect()
  naverAuth(
    @Query() query: OAuthEntryQueryDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): RedirectResult {
    return this.startOAuth('naver', query, reply);
  }

  // --- 콜백 ---
  // 가드(createOAuthCallbackGuard)가 passport보다 먼저 state + nonce 쿠키를 검증하고, 제공자 오류·
  // passport 실패도 예외 대신 판정 결과로 남긴다. 전략은 state store 없이 생성되므로
  // passport-oauth2 자체는 NullStore를 써서 state를 검사하지 않는다.
  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  @Redirect()
  async googleCallback(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<RedirectResult> {
    return this.handleCallback('google', req, reply);
  }

  @Public()
  @Get('naver/callback')
  @UseGuards(NaverOauthGuard)
  @Redirect()
  async naverCallback(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<RedirectResult> {
    return this.handleCallback('naver', req, reply);
  }

  private startOAuth(
    provider: OAuthProvider,
    query: OAuthEntryQueryDto,
    reply: FastifyReply,
  ): RedirectResult {
    // 모바일은 PKCE 필수: challenge 없이 시작하면 앱 딥링크로 오류를 돌려준다.
    if (query.client === 'mobile' && !query.code_challenge) {
      return this.redirect(
        buildPostLoginRedirect(
          { kind: 'error', error: 'pkce_required' },
          'mobile',
          this.redirectBases(),
        ),
      );
    }
    const isMobile = query.client === 'mobile';
    const { state, nonce } = this.stateService.sign(
      query.client,
      isMobile ? query.code_challenge : undefined,
      isMobile ? query.platform : undefined,
    );
    reply.header('set-cookie', this.stateService.nonceCookie(nonce));
    return this.redirect(this.buildAuthorizeUrl(provider, state));
  }

  /** 각 제공자의 authorize URL을 구성한다. redirect_uri는 콜백 전략의 callbackURL과 일치해야 한다. */
  private buildAuthorizeUrl(provider: OAuthProvider, state: string): string {
    const apiBaseUrl =
      this.config.get<string>('API_BASE_URL') ?? 'http://localhost:4000';
    const redirectUri = `${apiBaseUrl}/auth/${provider}/callback`;

    if (provider === 'naver') {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: this.config.get<string>('NAVER_CLIENT_ID') ?? '',
        redirect_uri: redirectUri,
        state,
      });
      return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.get<string>('GOOGLE_CLIENT_ID') ?? '',
      redirect_uri: redirectUri,
      scope: 'email profile',
      access_type: 'online',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * 소셜 인증 후: 토큰을 발급하고, 토큰을 URL에 노출하지 않도록
   * 일회용 code만 클라이언트(웹 콜백 / 앱 딥링크)로 전달한다. 클라이언트가 code를 교환한다.
   */
  private async handleCallback(
    provider: string,
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<RedirectResult> {
    // nonce 쿠키는 일회용: 결과와 무관하게 콜백 응답에서 지운다.
    reply.header('set-cookie', this.stateService.clearNonceCookie());
    const bases = this.redirectBases();

    const ctx = getOAuthCallbackContext(req) ?? {
      kind: 'error' as const,
      client: 'web' as const,
      error: 'invalid_state',
    };
    if (ctx.kind === 'error') {
      return this.redirect(
        buildPostLoginRedirect(
          { kind: 'error', error: ctx.error },
          ctx.client,
          bases,
        ),
      );
    }

    const outcome = await this.resolveOutcome(provider, req, ctx.state);
    return this.redirect(
      buildPostLoginRedirect(outcome, ctx.state.client, bases),
    );
  }

  private async resolveOutcome(
    provider: string,
    req: FastifyRequest,
    state: OAuthStateClaims,
  ): Promise<PostLoginOutcome> {
    const oauthUser = (req as unknown as { user?: OAuthUser }).user;
    if (!oauthUser?.email) {
      return { kind: 'error', error: 'oauth' };
    }

    // REST 경로라 예외를 던지면 전역 ExceptionFilter(GraphQL 전용)가 응답을 못 보내 멈춘다.
    // resolveOAuthLogin은 예외 대신 판별 결과를 반환하므로 그에 따라 리다이렉트한다.
    // 세션 platform: 웹 콜백은 web, 모바일은 앱이 진입 시 보낸 ios|android(모르면 기본값).
    const platform = state.client === 'mobile' ? state.platform : 'web';
    let result: Awaited<ReturnType<AuthService['resolveOAuthLogin']>>;
    try {
      result = await this.authService.resolveOAuthLogin(oauthUser, platform);
    } catch {
      return { kind: 'error', error: 'oauth' };
    }

    // 연동 필요: local 비밀번호가 있으면 연동 화면으로, 없으면(순수 소셜) 연동 불가 안내.
    if (result.kind === 'link_required') {
      if (!result.canPasswordLink) {
        return { kind: 'error', error: 'account_exists' };
      }
      const ticket = this.linkStore.issue({
        email: result.email,
        provider: result.provider,
        platform,
      });
      return { kind: 'link_required', provider: result.provider, ticket };
    }

    // 인증 완료: 토큰을 일회용 code로 감싸 전달. 모바일은 PKCE challenge를 함께 보관한다.
    return {
      kind: 'authenticated',
      provider,
      code: this.codeStore.issue(result.token, state.codeChallenge),
    };
  }

  private redirectBases(): PostLoginRedirectBases {
    return {
      webBaseUrl:
        this.config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000',
      mobileRedirectUri: this.config.get<string>('MOBILE_REDIRECT_URI'),
    };
  }

  private redirect(url: string): RedirectResult {
    return { url, statusCode: 302 };
  }
}
