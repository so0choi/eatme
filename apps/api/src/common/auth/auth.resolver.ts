import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { Public } from '@common/decorators/setMetadata';
import { LoginDto, LoginToken } from './dtos/login.dto';
import { AuthService } from './auth.service';
import { OAuthCodeStore } from './oauth-code.store';
import { SocialLinkStore } from './social-link.store';
import { CurrentUser } from '@common/decorators/getCurrentUser';

@Resolver()
export class AuthResolver {
  constructor(
    private authService: AuthService,
    private codeStore: OAuthCodeStore,
    private linkStore: SocialLinkStore,
  ) {}

  @Public()
  @Mutation(() => LoginToken)
  async login(@Args('input') input: LoginDto): Promise<LoginToken> {
    return this.authService.localLogin(input);
  }

  // OAuth 콜백이 발급한 일회용 code를 실제 토큰으로 교환한다.
  @Public()
  @Mutation(() => LoginToken)
  async exchangeOAuthCode(@Args('code') code: string): Promise<LoginToken> {
    const token = this.codeStore.consume(code);
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

  @Mutation(() => Boolean)
  async logout(@CurrentUser() user: { id: number }): Promise<boolean> {
    await this.authService.logout(user.id);
    return true;
  }
}
