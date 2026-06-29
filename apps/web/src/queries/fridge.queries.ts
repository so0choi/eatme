import { gql } from '@apollo/client';

export const GET_ALL_INGREDIENTS = gql(`
  query AllIngredients {
    getAllIngredients {
      category
      id
      price
      name
      expireAt
      createdAt
      updatedAt
      quantity
      unit
      storage
      status
      imageUrl
    }
  }
`);

export const GET_INGREDIENT = gql(`
  query Ingredient($id: Int!) {
    ingredient(id: $id) {
      id
      name
      price
      quantity
      unit
      expireAt
      category
      storage
      status
      imageUrl
    }
  }
`);

export const CREATE_INGREDIENT = gql(`
  mutation CreateIngredient($input: CreateIngredientInput!) {
    createIngredient(input: $input) {
      id
      name
      price
      quantity
      status
      storage
      unit
      expireAt
      category
      imageUrl
    }
  }
`);

export const UPDATE_INGREDIENT = gql(`
  mutation UpdateIngredient($input: UpdateIngredientInput!) {
    updateIngredient(input: $input) {
      id
      name
      price
      quantity
      status
      storage
      unit
      expireAt
      category
      imageUrl
    }
  }
`);

export const DELETE_INGREDIENT = gql(`
  mutation DeleteIngredient($id: Int!) {
    deleteIngredient(id: $id)
  }
`);
