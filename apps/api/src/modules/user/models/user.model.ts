import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('User')
export class User {
  @Field(() => ID)
  id: number;

  @Field()
  email: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  provider?: string;

  @Field({ nullable: true })
  termsAgreedAt?: Date;

  @Field({ nullable: true })
  termsVersion?: string;

  @Field()
  pushEnabled: boolean;

  @Field(() => Int)
  pushHour: number;
}
