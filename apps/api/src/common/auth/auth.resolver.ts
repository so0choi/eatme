import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Public } from '@common/decorators/setMetadata';
import { LoginDto, LoginToken } from './dtos/login.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from '@common/decorators/getCurrentUser';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Public()
  @Mutation(() => LoginToken)
  async login(@Args('input') input: LoginDto): Promise<LoginToken> {
    return this.authService.localLogin(input);
  }

  @Mutation(() => Boolean)
  async logout(@CurrentUser() user: { id: number }): Promise<boolean> {
    await this.authService.logout(user.id);
    return true;
  }
}
