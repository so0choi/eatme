import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { CreateIngredientInput } from './create-ingredient.dto';
import { IngredientStatus } from '@prisma/enums';

@InputType()
export class UpdateIngredientInput extends PartialType(CreateIngredientInput) {
  @Field(() => Int)
  id: number;

  @Field(() => IngredientStatus, { nullable: true })
  status?: IngredientStatus;
}
