import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators/getCurrentUser';
import { Public } from '@common/decorators/setMetadata';
import { UsersService } from './users.service';
import { UserModel } from '@prisma/models';
import { User } from './models/user.model';
import { CreateUserInput } from './dtos/create.dto';
import { UpdateDto } from './dtos/update.dto';

@Resolver(() => User)
export class UsersResolver {
  constructor(private userService: UsersService) {}

  @Public()
  @Mutation(() => User, { name: 'signup' })
  async createUser(
    @Args('createUserInput') input: CreateUserInput,
  ): Promise<UserModel> {
    return this.userService.create(input);
  }

  @Query(() => User, { name: 'profile' })
  async getProfile(@CurrentUser() user: UserModel) {
    return this.userService.findOneByEmail(user.email);
  }

  @Mutation(() => User, { name: 'editProfile' })
  async editProfile(
    @CurrentUser() user: UserModel,
    @Args('data') updateDto: UpdateDto,
  ) {
    return this.userService.edit(user, updateDto);
  }
}
