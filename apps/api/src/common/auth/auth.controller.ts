import { Controller, Get, Redirect, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';
import { randomBytes } from 'crypto';
import { AuthService, OAuthUser } from './auth.service';
import { OAuthCodeStore } from './oauth-code.store';
import { SocialLinkStore } from './social-link.store';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { NaverOauthGuard } from './guards/naver-oauth.guard';
import { Public } from '@common/decorators/setMetadata';

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
  ) {}

  // --- 진입 (authorize 리다이렉트) ---
  // passport의 authorize 리다이렉트는 res.setHeader/res.end(Express 스타일)에 의존하는데
  // FastifyReply엔 해당 메서드가 없어 동작하지 않는다. 따라서 진입 단계는 passport 가드 대신
  // authorize URL을 직접 만들어 리다이렉트한다. (콜백은 passport 가드가 처리)
  @Public()
  @Get('google')
  @Redirect()
  googleAuth(): RedirectResult {
    return { url: this.buildAuthorizeUrl('google'), statusCode: 302 };
  }

  @Public()
  @Get('naver')
  @Redirect()
  naverAuth(): RedirectResult {
    return { url: this.buildAuthorizeUrl('naver'), statusCode: 302 };
  }

  // --- 콜백 (token 교환 + 프로필 검증: passport가 res 메서드 없이 처리 가능) ---
  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  @Redirect()
  async googleCallback(@Req() req: FastifyRequest): Promise<RedirectResult> {
    return this.handleCallback('google', req);
  }

  @Public()
  @Get('naver/callback')
  @UseGuards(NaverOauthGuard)
  @Redirect()
  async naverCallback(@Req() req: FastifyRequest): Promise<RedirectResult> {
    return this.handleCallback('naver', req);
  }

  /** 각 제공자의 authorize URL을 구성한다. redirect_uri는 콜백 전략의 callbackURL과 일치해야 한다. */
  private buildAuthorizeUrl(provider: OAuthProvider): string {
    const apiBaseUrl =
      this.config.get<string>('API_BASE_URL') ?? 'http://localhost:4000';
    const redirectUri = `${apiBaseUrl}/auth/${provider}/callback`;

    if (provider === 'naver') {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: this.config.get<string>('NAVER_CLIENT_ID') ?? '',
        redirect_uri: redirectUri,
        // 네이버는 state가 필수 파라미터라 임의 값 전달(현재 콜백 검증은 안 함 — CSRF 방어는 후속 과제).
        state: randomBytes(8).toString('hex'),
      });
      return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.get<string>('GOOGLE_CLIENT_ID') ?? '',
      redirect_uri: redirectUri,
      scope: 'email profile',
      access_type: 'online',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * 소셜 인증 성공 후: 토큰을 발급하고, 토큰을 URL에 노출하지 않도록
   * 일회용 code만 웹 콜백으로 전달한다. 웹이 code를 교환해 쿠키를 심는다.
   */
  private async handleCallback(
    provider: string,
    req: FastifyRequest,
  ): Promise<RedirectResult> {
    const webBaseUrl =
      this.config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000';
    const oauthUser = (req as unknown as { user?: OAuthUser }).user;

    if (!oauthUser?.email) {
      return { url: `${webBaseUrl}/login?error=oauth`, statusCode: 302 };
    }

    // REST 경로라 예외를 던지면 전역 ExceptionFilter(GraphQL 전용)가 응답을 못 보내 멈춘다.
    // resolveOAuthLogin은 예외 대신 판별 결과를 반환하므로 그에 따라 리다이렉트한다.
    let result: Awaited<ReturnType<AuthService['resolveOAuthLogin']>>;
    try {
      result = await this.authService.resolveOAuthLogin(oauthUser);
    } catch {
      return { url: `${webBaseUrl}/login?error=oauth`, statusCode: 302 };
    }

    // 연동 필요: local 비밀번호가 있으면 연동 페이지로, 없으면(순수 소셜) 연동 불가 안내.
    if (result.kind === 'link_required') {
      if (!result.canPasswordLink) {
        return { url: `${webBaseUrl}/login?error=account_exists`, statusCode: 302 };
      }
      const ticket = this.linkStore.issue({
        email: result.email,
        provider: result.provider,
      });
      return {
        url: `${webBaseUrl}/link?ticket=${ticket}&provider=${result.provider}`,
        statusCode: 302,
      };
    }

    // 인증 완료: 토큰을 일회용 code로 감싸 웹 콜백으로 전달.
    const code = this.codeStore.issue(result.token);
    return {
      url: `${webBaseUrl}/auth/${provider}/callback?code=${code}`,
      statusCode: 302,
    };
  }
}
