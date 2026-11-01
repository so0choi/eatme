import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AppConfig {
  @Field() minSupportedVersion: string;
  @Field() latestVersion: string;
  @Field(() => String, { nullable: true }) iosStoreUrl?: string | null;
  @Field(() => String, { nullable: true }) androidStoreUrl?: string | null;
  @Field() supportEmail: string;
}
