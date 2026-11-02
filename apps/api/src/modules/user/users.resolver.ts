import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { GqlThrottlerGuard } from '@common/guards/gql-throttler.guard';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators/getCurrentUser';
import { Public } from '@common/decorators/setMetadata';
import { AccountDeletionService } from './account-deletion.service';
import { UsersService } from './users.service';
import { UserModel } from '@prisma/models';
import { User } from './models/user.model';
import { CreateUserInput } from './dtos/create.dto';
import { UpdateDto } from './dtos/update.dto';

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private userService: UsersService,
    private accountDeletionService: AccountDeletionService,
  ) {}

  @UseGuards(GqlThrottlerGuard)
  @Public()
  @Mutation(() => User, { name: 'signup' })
  async createUser(
    @Args('createUserInput') input: CreateUserInput,
  ): Promise<UserModel> {
    return this.userService.create(input);
  }

  @Query(() => User, { name: 'profile' })
  async getProfile(@CurrentUser() user: UserModel) {
    const found = await this.userService.findOneByEmail(user.email);
    if (!found) throw new UnauthorizedException('USER_NOT_FOUND');
    return found;
  }

  @Mutation(() => User, { name: 'editProfile' })
  async editProfile(
    @CurrentUser() user: UserModel,
    @Args('data') updateDto: UpdateDto,
  ) {
    return this.userService.edit(user, updateDto);
  }

  @Mutation(() => User, { name: 'agreeTerms' })
  async agreeTerms(@CurrentUser() user: UserModel): Promise<UserModel> {
    return this.userService.agreeTerms(user.id);
  }

  @Mutation(() => Boolean, { name: 'deleteAccount' })
  async deleteAccount(@CurrentUser() user: UserModel): Promise<boolean> {
    await this.accountDeletionService.deleteAccount(user.id);
    return true;
  }
}
