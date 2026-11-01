import { Field, InputType } from '@nestjs/graphql';
import { updateUserSchema } from '@eatme/schemas';

@InputType()
export class UpdateDto {
  // nestjs-zod ZodValidationPipe는 isZodDto 플래그가 있는 클래스만 검증한다.
  static isZodDto = true;
  static schema = updateUserSchema;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  password?: string;
}
