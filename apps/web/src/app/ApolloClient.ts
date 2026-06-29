import { HttpLink, ApolloLink, Observable } from '@apollo/client';
import {
  registerApolloClient,
  ApolloClient,
  InMemoryCache,
} from '@apollo/client-integration-nextjs';
import { cookies } from 'next/headers';
import { TOKEN_COOKIE } from '@/lib/definitions';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors, CombinedProtocolErrors } from '@apollo/client/errors';

const errorLink = new ErrorLink(({ error, operation }) => {
  if (CombinedGraphQLErrors.is(error)) {
    error.errors.forEach(({ message, locations, path }) =>
      console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`),
    );
  } else if (CombinedProtocolErrors.is(error)) {
    error.errors.forEach(({ message, extensions }) =>
      console.log(
        `[Protocol error]: Message: ${message}, Extensions: ${JSON.stringify(extensions)}`,
      ),
    );
  } else {
    console.error(`[Network error]: ${error}`);
  }
});

export const { getClient, query, PreloadQuery } = registerApolloClient(() => {
  const httpLink = new HttpLink({
    uri: 'http://localhost:4000/graphql',
  });

  const authLink = new SetContextLink(async ({ headers }) => {
    const cookieStore = await cookies();
    const raw = cookieStore.get(TOKEN_COOKIE)?.value;
    const accessToken = raw ? JSON.parse(raw).accessToken : null;

    if (accessToken) {
      return {
        headers: { ...headers, authorization: `Bearer ${accessToken}` },
      };
    }
  });

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: authLink.concat(httpLink),
  });
});
