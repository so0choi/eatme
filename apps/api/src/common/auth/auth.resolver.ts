import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Public } from '@common/decorators/setMetadata';
import { LoginDto, LoginToken } from './dtos/login.dto';
import { AuthService } from './auth.service';
import { OAuthCodeStore } from './oauth-code.store';
import { SocialLinkStore } from './social-link.store';
import { CurrentUser } from '@common/decorators/getCurrentUser';
import { AppleLoginInput, AppleLoginResult } from './dtos/apple-login.dto';
import { AppleIdentityService } from './apple/apple-identity.service';
import { AppleTokenClient } from './apple/apple-token.client';

@Resolver()
export class AuthResolver {
  private readonly logger = new Logger(AuthResolver.name);

  constructor(
    private authService: AuthService,
    private codeStore: OAuthCodeStore,
    private linkStore: SocialLinkStore,
    private appleIdentity: AppleIdentityService,
    private appleTokenClient: AppleTokenClient,
  ) {}

  @Public()
  @Mutation(() => LoginToken)
  async login(@Args('input') input: LoginDto): Promise<LoginToken> {
    return this.authService.localLogin(input);
  }

  // refresh token rotation: 유효한 세션이면 새 access/refresh를 발급하고 기존 세션 행을 교체한다.
  @Public()
  @Mutation(() => LoginToken)
  async refreshToken(
    @Args('refreshToken') refreshToken: string,
  ): Promise<LoginToken> {
    return this.authService.rotateSession(refreshToken);
  }

  // OAuth 콜백이 발급한 일회용 code를 실제 토큰으로 교환한다.
  @Public()
  @Mutation(() => LoginToken)
  async exchangeOAuthCode(
    @Args('code') code: string,
    // 모바일(PKCE) code는 authorize 진입 시 보낸 code_challenge에 대응하는 verifier가 필요하다.
    @Args('codeVerifier', { type: () => String, nullable: true })
    codeVerifier?: string | null,
  ): Promise<LoginToken> {
    const token = this.codeStore.consume(code, codeVerifier ?? undefined);
    if (!token) {
      throw new UnauthorizedException('INVALID_OAUTH_CODE');
    }
    return token;
  }

  // 소셜 로그인 충돌 시 발급된 연동 티켓 + 기존 비밀번호로 계정을 연동하고 로그인한다.
  @Public()
  @Mutation(() => LoginToken)
  async linkSocialAccount(
    @Args('ticket') ticket: string,
    @Args('password') password: string,
  ): Promise<LoginToken> {
    const pending = this.linkStore.consume(ticket);
    if (!pending) {
      throw new UnauthorizedException('INVALID_LINK_TICKET');
    }
    return this.authService.linkSocialAccount(
      pending.email,
      pending.provider,
      password,
    );
  }

  // Sign in with Apple(iOS): identityToken 검증 → 소셜 로그인 판별 → Apple refresh token 보관.
  @Public()
  @Mutation(() => AppleLoginResult)
  async appleLogin(
    @Args('input') input: AppleLoginInput,
  ): Promise<AppleLoginResult> {
    const { email } = await this.appleIdentity.verify(input.identityToken);
    const result = await this.authService.resolveOAuthLogin(
      { email, name: input.name ?? undefined, provider: 'apple' },
      input.platform ?? undefined,
    );

    // 같은 이메일이 다른 방식으로 가입돼 있음: 웹 콜백과 같은 규칙으로 연동 티켓 또는 연동 불가.
    if (result.kind === 'link_required') {
      if (!result.canPasswordLink) {
        throw new UnauthorizedException('ACCOUNT_EXISTS');
      }
      const linkTicket = this.linkStore.issue({
        email: result.email,
        provider: result.provider,
      });
      return { token: null, linkTicket, provider: result.provider };
    }

    // 계정 삭제 시 revoke용 refresh token. 교환 실패가 로그인을 막지는 않는다.
    try {
      const appleRefreshToken = await this.appleTokenClient.exchangeCode(
        input.authorizationCode,
      );
      await this.authService.saveAppleRefreshToken(email, appleRefreshToken);
    } catch (error) {
      this.logger.error(
        `Apple authorization code exchange failed: ${(error as Error).message}`,
      );
    }
    return { token: result.token, linkTicket: null, provider: 'apple' };
  }

  @Mutation(() => Boolean)
  async logout(
    @CurrentUser() user: { id: number },
    @Args('refreshToken') refreshToken: string,
  ): Promise<boolean> {
    await this.authService.logout(user.id, refreshToken);
    return true;
  }
}
