'use server';

import { cookies } from 'next/headers';
import { TOKEN_COOKIE } from '@/lib/definitions';
import { redirect } from 'next/navigation';
import { getClient } from '../ApolloClient';
import { LOGOUT_MUTATION } from '@/queries/auth.queries';
import { parseStoredToken } from '@/lib/token-refresh';

export async function logout() {
  const cookieStore = await cookies();
  const session = cookieStore.get(TOKEN_COOKIE);
  if (session) {
    // 현재 기기의 세션만 종료한다(refresh token으로 세션 식별).
    const token = parseStoredToken(session.value);
    if (token) {
      try {
        await getClient().mutate({
          mutation: LOGOUT_MUTATION,
          variables: { refreshToken: token.refreshToken },
        });
      } catch (err) {
        console.error(err);
      }
    }
    cookieStore.delete(TOKEN_COOKIE);
    getClient().resetStore();
  }

  redirect('/');
}
