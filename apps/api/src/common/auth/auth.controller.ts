import {
  Controller,
  Get,
  Query,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';
import { AuthService, OAuthUser } from './auth.service';
import { OAuthCodeStore } from './oauth-code.store';
import { SocialLinkStore } from './social-link.store';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { NaverOauthGuard } from './guards/naver-oauth.guard';
import { Public } from '@common/decorators/setMetadata';
import {
  buildPostLoginRedirect,
  OAuthClient,
  OAuthStateService,
  PostLoginOutcome,
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
  @Public()
  @Get('google')
  @Redirect()
  googleAuth(@Query() query: OAuthEntryQueryDto): RedirectResult {
    return {
      url: this.buildAuthorizeUrl('google', query.client),
      statusCode: 302,
    };
  }

  @Public()
  @Get('naver')
  @Redirect()
  naverAuth(@Query() query: OAuthEntryQueryDto): RedirectResult {
    return {
      url: this.buildAuthorizeUrl('naver', query.client),
      statusCode: 302,
    };
  }

  // --- 콜백 (token 교환 + 프로필 검증: passport가 res 메서드 없이 처리 가능) ---
  // 전략은 state store 없이 생성되므로 passport-oauth2는 NullStore를 써서 state를 검사하지 않는다.
  // state 검증은 핸들러에서 OAuthStateService로 직접 한다.
  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  @Redirect()
  async googleCallback(
    @Req() req: FastifyRequest,
    @Query('state') state?: string,
  ): Promise<RedirectResult> {
    return this.handleCallback('google', req, state);
  }

  @Public()
  @Get('naver/callback')
  @UseGuards(NaverOauthGuard)
  @Redirect()
  async naverCallback(
    @Req() req: FastifyRequest,
    @Query('state') state?: string,
  ): Promise<RedirectResult> {
    return this.handleCallback('naver', req, state);
  }

  /** 각 제공자의 authorize URL을 구성한다. redirect_uri는 콜백 전략의 callbackURL과 일치해야 한다. */
  private buildAuthorizeUrl(
    provider: OAuthProvider,
    client: OAuthClient,
  ): string {
    const apiBaseUrl =
      this.config.get<string>('API_BASE_URL') ?? 'http://localhost:4000';
    const redirectUri = `${apiBaseUrl}/auth/${provider}/callback`;
    // 서명된 state(JWT, 5분): 콜백에서 검증해 OAuth CSRF를 막고, 시작한 client를 전달한다.
    const state = this.stateService.sign(client);

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
   * 소셜 인증 성공 후: 토큰을 발급하고, 토큰을 URL에 노출하지 않도록
   * 일회용 code만 클라이언트(웹 콜백 / 앱 딥링크)로 전달한다. 클라이언트가 code를 교환한다.
   */
  private async handleCallback(
    provider: string,
    req: FastifyRequest,
    state: string | undefined,
  ): Promise<RedirectResult> {
    const bases = {
      webBaseUrl:
        this.config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000',
      mobileRedirectUri: this.config.get<string>('MOBILE_REDIRECT_URI'),
    };

    // state가 없거나 위조/만료면 시작한 client를 알 수 없으므로 웹 로그인으로 보낸다.
    const verified = this.stateService.verify(state);
    if (!verified) {
      return this.redirect(
        buildPostLoginRedirect(
          { kind: 'error', error: 'invalid_state' },
          'web',
          bases,
        ),
      );
    }

    const outcome = await this.resolveOutcome(provider, req);
    return this.redirect(
      buildPostLoginRedirect(outcome, verified.client, bases),
    );
  }

  private async resolveOutcome(
    provider: string,
    req: FastifyRequest,
  ): Promise<PostLoginOutcome> {
    const oauthUser = (req as unknown as { user?: OAuthUser }).user;
    if (!oauthUser?.email) {
      return { kind: 'error', error: 'oauth' };
    }

    // REST 경로라 예외를 던지면 전역 ExceptionFilter(GraphQL 전용)가 응답을 못 보내 멈춘다.
    // resolveOAuthLogin은 예외 대신 판별 결과를 반환하므로 그에 따라 리다이렉트한다.
    let result: Awaited<ReturnType<AuthService['resolveOAuthLogin']>>;
    try {
      result = await this.authService.resolveOAuthLogin(oauthUser);
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
      });
      return { kind: 'link_required', provider: result.provider, ticket };
    }

    // 인증 완료: 토큰을 일회용 code로 감싸 전달.
    return {
      kind: 'authenticated',
      provider,
      code: this.codeStore.issue(result.token),
    };
  }

  private redirect(url: string): RedirectResult {
    return { url, statusCode: 302 };
  }
}
