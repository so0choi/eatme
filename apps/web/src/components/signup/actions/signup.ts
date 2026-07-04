'use server';

import { z } from 'zod';

import { getClient } from '../../../app/ApolloClient';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import {
  LOGIN_MUTATION,
  SIGN_UP_MUTATION,
} from '../../../queries/auth.queries';
import { TOKEN_COOKIE } from '@/lib/definitions';

const schema = z
  .object({
    email: z.email(),
    password: z.string(),
    confirmPassword: z.string(),
    phone: z.string().optional(),
    name: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

type LoginResponse = {
  login: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
};

export async function signUp(_: any, formData: FormData) {
  const rawFormData = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    phone: formData.get('phone'),
  };

  const validatedFields = schema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      error: z.flattenError(validatedFields.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const { name, email, password, phone } = validatedFields.data;
  const input = {
    name,
    email,
    password,
    phone,
    provider: 'local',
  };

  try {
    await getClient().mutate<{ signup: { id: number } }>({
      mutation: SIGN_UP_MUTATION,
      variables: { input },
    });
  } catch (err) {
    if (CombinedGraphQLErrors.is(err)) {
      const code = err.errors[0]?.extensions?.code;
      if (code === 'CONFLICT') {
        return { error: { email: ['이미 사용 중인 이메일입니다.'] } };
      }
    }
    return { error: { _form: ['회원가입에 실패했습니다.'] } };
  }

  let session: LoginResponse['login'] | undefined;
  try {
    const { data: loginData } = await getClient().mutate<LoginResponse>({
      mutation: LOGIN_MUTATION,
      variables: { input: { email, password } },
    });
    session = loginData?.login;
  } catch {
    // fall through
  }

  if (!session) {
    redirect('/login');
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

  redirect('/');
}
