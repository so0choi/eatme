import { ArgsType, Field } from '@nestjs/graphql';
import { z } from 'zod';

/** 푸시를 받을 수 있는 플랫폼(웹은 푸시 없음). */
export const PUSH_PLATFORMS = ['ios', 'android'] as const;

@ArgsType()
export class RegisterPushTokenArgs {
  // nestjs-zod ZodValidationPipe는 isZodDto 플래그가 있는 클래스만 검증한다.
  static isZodDto = true;
  static schema = z.object({
    token: z.string().trim().min(1).max(512),
    platform: z.enum(PUSH_PLATFORMS),
  });

  @Field()
  token: string;

  @Field()
  platform: string;
}
