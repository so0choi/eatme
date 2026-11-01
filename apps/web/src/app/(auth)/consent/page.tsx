import { redirect } from 'next/navigation';
import { getClient } from '@/app/ApolloClient';
import { PROFILE_TERMS_QUERY } from '@/queries/auth.queries';
import ConsentForm from './ConsentForm';

export const metadata = {
  title: '약관 동의 | 냉부',
  description: '서비스 이용약관과 개인정보 처리방침에 동의해 주세요.',
};

type ProfileTermsResponse = {
  profile: { id: string; termsAgreedAt?: string | null };
};

export default async function ConsentPage() {
  let agreed = false;
  try {
    const { data } = await getClient().query<ProfileTermsResponse>({
      query: PROFILE_TERMS_QUERY,
      fetchPolicy: 'no-cache',
    });
    agreed = Boolean(data?.profile.termsAgreedAt);
  } catch {
    // 조회 실패 시 동의 폼을 그대로 보여준다.
  }

  // 이미 동의한 사용자는 냉장고로 보낸다.
  if (agreed) {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-16 pt-12 sm:px-6 lg:flex-row lg:px-8 lg:pt-16">
      <section className="flex-1 rounded-3xl bg-linear-to-br from-primary to-primary-container p-8 shadow-ambient">
        <p className="text-xs font-semibold uppercase tracking-[0.05rem] text-on-primary/80">
          Almost there
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold text-on-primary sm:text-4xl">
          냉장고 관리를 시작하기 전에
        </h1>
        <p className="mt-4 text-base leading-relaxed text-on-primary/90">
          냉부는 등록한 식재료와 유통기한 정보를 바탕으로 알림과 레시피 추천을 제공해요.
          어떤 정보를 어떻게 다루는지 확인하고 동의해 주세요.
        </p>
      </section>
      <ConsentForm />
    </main>
  );
}
