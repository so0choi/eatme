import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/app/ApolloClient';
import { TOKEN_COOKIE } from '@/lib/definitions';
import { EXCHANGE_OAUTH_CODE_MUTATION } from '@/queries/auth.queries';

type ExchangeResponse = {
  exchangeOAuthCode: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
};

const SUPPORTED_PROVIDERS = ['naver', 'google'];

// OAuth 콜백: API가 발급한 일회용 code를 토큰으로 교환하고 bt-token 쿠키를 심는다.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const code = request.nextUrl.searchParams.get('code');

  const loginUrl = new URL('/login', request.url);

  if (!SUPPORTED_PROVIDERS.includes(provider) || !code) {
    loginUrl.searchParams.set('error', 'oauth');
    return NextResponse.redirect(loginUrl);
  }

  let session: ExchangeResponse['exchangeOAuthCode'];
  try {
    const { data } = await getClient().mutate<ExchangeResponse>({
      mutation: EXCHANGE_OAUTH_CODE_MUTATION,
      variables: { code },
    });
    session = data!.exchangeOAuthCode;
  } catch {
    loginUrl.searchParams.set('error', 'oauth');
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  const sessionData = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: Date.now() + session.expiresIn * 1000,
  };

  response.cookies.set(TOKEN_COOKIE, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: session.refreshExpiresIn,
    path: '/',
  });

  return response;
}
