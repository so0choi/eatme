import { gql } from '@apollo/client';

export const GET_ALL_RECIPES = gql(`
  query AllRecipes {
    getAllRecipes {
      id
      title
      description
      imageUrl
      servings
      cookTime
      difficulty
      ingredients {
        id
        name
        quantity
        unit
        optional
      }
    }
  }
`);

export const GET_RECIPE = gql(`
  query Recipe($id: Int!) {
    recipe(id: $id) {
      id
      title
      description
      imageUrl
      servings
      cookTime
      difficulty
      steps
      ingredients {
        id
        name
        quantity
        unit
        optional
      }
    }
  }
`);
