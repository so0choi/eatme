import { Field, InputType, Int, ObjectType, PickType } from '@nestjs/graphql';
import { CreateUserInput } from '../../../modules/user/dtos/create.dto';

@InputType()
export class LoginDto extends PickType(CreateUserInput, ['email', 'password']) {
  @Field({ nullable: true })
  autologin?: boolean;
}

@ObjectType()
export class LoginToken {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;

  @Field(() => Int)
  expiresIn: number;

  @Field(() => Int)
  refreshExpiresIn: number;
}
