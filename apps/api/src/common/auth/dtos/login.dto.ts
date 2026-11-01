import { Field, InputType, Int, ObjectType, PickType } from '@nestjs/graphql';
import { z } from 'zod';
import { loginSchema } from '@eatme/schemas';
import { CreateUserInput } from '../../../modules/user/dtos/create.dto';

export const SESSION_PLATFORMS = ['web', 'ios', 'android'] as const;

@InputType()
export class LoginDto extends PickType(CreateUserInput, ['email', 'password']) {
  // nestjs-zod ZodValidationPipe는 isZodDto 플래그가 있는 클래스만 검증한다.
  static isZodDto = true;
  static schema = loginSchema.extend({
    autologin: z.boolean().nullish(),
    platform: z.enum(SESSION_PLATFORMS).nullish(),
  });

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
