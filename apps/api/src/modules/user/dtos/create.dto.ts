import { CoreResponse } from '@common/dtos/core-response.dto';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { User } from '../models/user.model';
import { createUserSchema } from '@bangtalchul/schemas';

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

@ObjectType()
export class CreateUserOutput extends CoreResponse {
  @Field(() => User, { nullable: true })
  user?: User;
}
