import { Field, InputType, Int, ObjectType, PickType } from '@nestjs/graphql';
import { CreateUserInput } from '../../../modules/user/dtos/create.dto';

@InputType()
export class LoginDto extends PickType(CreateUserInput, ['email', 'password']) {
  @Field({ nullable: true })
  autologin?: boolean;

  /** 세션을 발급받는 기기 플랫폼(web | ios | android). 기본 web. */
  @Field({ nullable: true })
  platform?: string;
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
