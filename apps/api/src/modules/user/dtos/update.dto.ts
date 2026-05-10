import { Field, InputType } from '@nestjs/graphql';
import { updateUserSchema } from '@bangtalchul/schemas';

@InputType()
export class UpdateDto {
  static schema = updateUserSchema;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  password?: string;
}
