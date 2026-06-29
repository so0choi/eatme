import { Field, InputType } from '@nestjs/graphql';
import { updateUserSchema } from '@eatme/schemas';

@InputType()
export class UpdateDto {
  static schema = updateUserSchema;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  password?: string;
}
