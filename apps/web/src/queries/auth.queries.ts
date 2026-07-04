import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginDto!) {
    login(input: $input) {
      accessToken
      refreshToken
      expiresIn
      refreshExpiresIn
    }
  }
`;

export const SIGN_UP_MUTATION = gql`
  mutation Signup($input: CreateUserInput!) {
    signup(createUserInput: $input) {
      id
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export const EXCHANGE_OAUTH_CODE_MUTATION = gql`
  mutation ExchangeOAuthCode($code: String!) {
    exchangeOAuthCode(code: $code) {
      accessToken
      refreshToken
      expiresIn
      refreshExpiresIn
    }
  }
`;

export const LINK_SOCIAL_ACCOUNT_MUTATION = gql`
  mutation LinkSocialAccount($ticket: String!, $password: String!) {
    linkSocialAccount(ticket: $ticket, password: $password) {
      accessToken
      refreshToken
      expiresIn
      refreshExpiresIn
    }
  }
`;
