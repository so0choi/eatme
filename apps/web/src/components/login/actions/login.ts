'use server';
import { getClient } from '@/app/ApolloClient';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { TOKEN_COOKIE } from '@/lib/definitions';
import { LOGIN_MUTATION } from '@/queries/auth.queries';

type LoginResponse = {
  login: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
};

export async function login(_: any, formData: FormData) {
  const isAutologin = formData.get('autologin') === 'on';
  const input = {
    email: formData.get('email'),
    password: formData.get('password'),
    autologin: isAutologin,
  };

  let session: LoginResponse['login'];
  try {
    const { data } = await getClient().mutate<LoginResponse>({
      mutation: LOGIN_MUTATION,
      variables: { input },
    });
    session = data!.login;
  } catch (err) {
    if (CombinedGraphQLErrors.is(err)) {
      const code = err.errors[0]?.extensions?.code;
      if (code === 'UNAUTHENTICATED') {
        return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
      }
    }
    return { error: '로그인에 실패했습니다.' };
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
