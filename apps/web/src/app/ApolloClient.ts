import { HttpLink, ApolloLink, Observable } from '@apollo/client';
import {
  registerApolloClient,
  ApolloClient,
  InMemoryCache,
} from '@apollo/client-integration-nextjs';
import { cookies, headers as requestHeaders } from 'next/headers';
import { API_BASE_URL, TOKEN_COOKIE } from '@/lib/definitions';
import { forwardedFor } from '@/lib/forwarded-for';
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
    uri: `${API_BASE_URL}/graphql`,
  });

  // Next 서버가 브라우저 대신 API를 호출하므로 accessToken과 함께 브라우저 IP(x-forwarded-for)를
  // 전달한다(API rate-limit이 Next 서버 IP 하나로 묶이지 않도록. API는 TRUST_PROXY 설정 필요).
  const authLink = new SetContextLink(async ({ headers }) => {
    const cookieStore = await cookies();
    const raw = cookieStore.get(TOKEN_COOKIE)?.value;
    const accessToken = raw ? JSON.parse(raw).accessToken : null;
    const clientIp = forwardedFor(await requestHeaders());

    return {
      headers: {
        ...headers,
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(clientIp ? { 'x-forwarded-for': clientIp } : {}),
      },
    };
  });

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: authLink.concat(httpLink),
  });
});
