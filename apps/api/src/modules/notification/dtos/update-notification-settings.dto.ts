import { ArgsType, Field, Int } from '@nestjs/graphql';
import { z } from 'zod';

@ArgsType()
export class UpdateNotificationSettingsArgs {
  // nestjs-zod ZodValidationPipe는 isZodDto 플래그가 있는 클래스만 검증한다.
  static isZodDto = true;
  static schema = z.object({
    pushEnabled: z.boolean(),
    // 알림 받을 시각(KST, 0~23시).
    pushHour: z.number().int().min(0).max(23),
  });

  @Field()
  pushEnabled: boolean;

  @Field(() => Int)
  pushHour: number;
}
