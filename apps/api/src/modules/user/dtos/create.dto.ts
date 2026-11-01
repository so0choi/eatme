import { Field, InputType } from '@nestjs/graphql';
import { createUserSchema } from '@eatme/schemas';

@InputType()
export class CreateUserInput {
  // nestjs-zod ZodValidationPipe는 isZodDto 플래그가 있는 클래스만 검증한다.
  static isZodDto = true;
  static schema = createUserSchema;

  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  provider?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field()
  agreeTerms: boolean;
}
