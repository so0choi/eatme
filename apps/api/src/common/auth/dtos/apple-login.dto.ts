import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { z } from 'zod';
import { LoginToken, SESSION_PLATFORMS } from './login.dto';

@InputType()
export class AppleLoginInput {
  // nestjs-zod ZodValidationPipe는 isZodDto 플래그가 있는 클래스만 검증한다.
  static isZodDto = true;
  static schema = z.object({
    identityToken: z.string().min(1),
    authorizationCode: z.string().min(1),
    name: z.string().nullish(),
    platform: z.enum(SESSION_PLATFORMS).nullish(),
  });

  @Field()
  identityToken: string;

  @Field()
  authorizationCode: string;

  /** Apple은 최초 로그인 때만 이름을 준다. 이후 생략 시 기존 이름 유지. */
  @Field({ nullable: true })
  name?: string;

  /** 세션을 발급받는 기기 플랫폼(web | ios | android). 기본 web. */
  @Field({ nullable: true })
  platform?: string;
}

/** 로그인 성공 시 token, 기존 계정과 연동이 필요하면 linkTicket + provider만 채운다. */
@ObjectType()
export class AppleLoginResult {
  @Field(() => LoginToken, { nullable: true })
  token?: LoginToken | null;

  @Field(() => String, { nullable: true })
  linkTicket?: string | null;

  @Field(() => String, { nullable: true })
  provider?: string | null;
}
