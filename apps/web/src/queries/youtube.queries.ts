import { gql } from '@apollo/client';

export const GET_COOKING_SHORTS = gql(`
  query CookingShorts {
    cookingShorts {
      videoId
      title
      channelTitle
      thumbnailUrl
      publishedAt
    }
  }
`);
