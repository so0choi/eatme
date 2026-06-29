import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { CreateRecipeInput } from './create-recipe.dto';

@InputType()
export class UpdateRecipeInput extends PartialType(CreateRecipeInput) {
  @Field(() => Int)
  id: number;
}
