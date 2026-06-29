import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('MonthlyIngredientWaste')
export class MonthlyIngredientWaste {
  @Field()
  month: string;

  @Field(() => Int)
  totalLoss: number;

  @Field(() => Int)
  discardedCount: number;
}
