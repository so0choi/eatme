'use server';
import { getClient } from '@/app/ApolloClient';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { TOKEN_COOKIE } from '@/lib/definitions';
import { LINK_SOCIAL_ACCOUNT_MUTATION } from '@/queries/auth.queries';

type LinkResponse = {
  linkSocialAccount: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
};

export async function linkAccount(_: unknown, formData: FormData) {
  const ticket = String(formData.get('ticket') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!ticket) {
    return { error: '연동 요청이 만료되었습니다. 다시 시도해 주세요.' };
  }

  let session: LinkResponse['linkSocialAccount'];
  try {
    const { data } = await getClient().mutate<LinkResponse>({
      mutation: LINK_SOCIAL_ACCOUNT_MUTATION,
      variables: { ticket, password },
    });
    session = data!.linkSocialAccount;
  } catch (err) {
    if (CombinedGraphQLErrors.is(err)) {
      const code = err.errors[0]?.extensions?.code;
      if (code === 'UNAUTHENTICATED') {
        return {
          error: '비밀번호가 올바르지 않거나 연동 요청이 만료되었습니다.',
        };
      }
    }
    return { error: '계정 연동에 실패했습니다.' };
  }

  const cookieStore = await cookies();
  const sessionData = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: Date.now() + session.expiresIn * 1000,
  };

  cookieStore.set(TOKEN_COOKIE, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: session.refreshExpiresIn,
    path: '/',
  });

  redirect('/dashboard');
}
