import { InputType, OmitType } from '@nestjs/graphql';

import { Review } from '../models/review.model';
import { createReviewSchema } from '@eatme/schemas';

@InputType()
export class CreateReviewInput extends OmitType(
  Review,
  ['id', 'comments', 'author'],
  InputType,
) {
  // nestjs-zod ZodValidationPipe는 isZodDto 플래그가 있는 클래스만 검증한다.
  static isZodDto = true;
  static schema = createReviewSchema;

  authorId: number;
}
