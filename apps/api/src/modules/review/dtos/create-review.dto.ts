import { Field, InputType, ObjectType, OmitType } from '@nestjs/graphql';

import { CoreResponse } from '@common/dtos/core-response.dto';
import { Review } from '../models/review.model';
import { createReviewSchema } from '@bangtalchul/schemas';

@InputType()
export class CreateReviewInput extends OmitType(
  Review,
  ['id', 'comments', 'author'],
  InputType,
) {
  static schema = createReviewSchema;

  authorId: number;
}

@ObjectType()
export class CreateReviewOutput extends CoreResponse {
  @Field()
  review?: Review;
}
