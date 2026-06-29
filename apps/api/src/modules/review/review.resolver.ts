import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CreateReviewInput } from './dtos/create-review.dto';
import { Review } from './models/review.model';
import { ReviewService } from './review.service';
import { CurrentUser } from '@common/decorators/getCurrentUser';
import { User } from '@modules/user/models/user.model';

@Resolver(() => Review)
export class ReviewResolver {
  constructor(private readonly reviewService: ReviewService) {}

  @Mutation(() => Review, { name: 'createReview' })
  async create(
    @Args('createReviewInput') createReviewInput: CreateReviewInput,
    @CurrentUser() user: User,
  ): Promise<Review> {
    return this.reviewService.create({
      authorId: user.id,
      ...createReviewInput,
    });
  }
}
