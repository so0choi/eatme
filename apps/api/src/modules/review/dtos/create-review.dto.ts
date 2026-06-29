import { InputType, OmitType } from '@nestjs/graphql';

import { Review } from '../models/review.model';
import { createReviewSchema } from '@eatme/schemas';

@InputType()
export class CreateReviewInput extends OmitType(
  Review,
  ['id', 'comments', 'author'],
  InputType,
) {
  static schema = createReviewSchema;

  authorId: number;
}
