import { Field, InputType } from '@nestjs/graphql';
import { createUserSchema } from '@eatme/schemas';

@InputType()
export class CreateUserInput {
  static schema = createUserSchema;

  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  provider?: string;

  @Field(() => [String], { nullable: true })
  preferenceTags?: string[];

  @Field({ nullable: true })
  phone?: string;
}
