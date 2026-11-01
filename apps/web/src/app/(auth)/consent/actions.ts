'use server';

import { redirect } from 'next/navigation';
import { getClient } from '@/app/ApolloClient';
import { AGREE_TERMS_MUTATION } from '@/queries/auth.queries';

export type ConsentState = { error?: string } | undefined;

export async function agreeToTerms(
  _: ConsentState,
  formData: FormData,
): Promise<ConsentState> {
  if (formData.get('agreeTerms') !== 'on') {
    return { error: '서비스 이용약관 및 개인정보 수집·이용에 동의해 주세요.' };
  }

  try {
    await getClient().mutate({ mutation: AGREE_TERMS_MUTATION });
  } catch (err) {
    console.error(err);
    return { error: '약관 동의 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' };
  }

  redirect('/dashboard');
}
