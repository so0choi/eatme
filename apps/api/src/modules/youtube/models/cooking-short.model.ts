import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CookingShort')
export class CookingShort {
  @Field()
  videoId: string;

  @Field()
  title: string;

  @Field()
  channelTitle: string;

  @Field()
  thumbnailUrl: string;

  @Field({ nullable: true })
  publishedAt?: string;
}
