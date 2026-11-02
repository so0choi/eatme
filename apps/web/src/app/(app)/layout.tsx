import { redirect } from 'next/navigation';
import { getClient } from '@/app/ApolloClient';
import { PROFILE_TERMS_QUERY } from '@/queries/auth.queries';

type ProfileTermsResponse = {
  profile: { id: string; termsAgreedAt?: string | null; termsVersion?: string | null };
};

// 소셜 가입 등으로 약관 동의 기록이 없으면 동의 화면으로 보낸다.
// 프로필 조회 자체가 실패하면(네트워크 등) 게이트를 건너뛰고 각 페이지의 에러 처리에 맡긴다.
async function hasAgreedTerms(): Promise<boolean> {
  try {
    const { data } = await getClient().query<ProfileTermsResponse>({
      query: PROFILE_TERMS_QUERY,
      fetchPolicy: 'no-cache',
    });
    return !data || Boolean(data.profile.termsAgreedAt);
  } catch {
    return true;
  }
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!(await hasAgreedTerms())) {
    redirect('/consent');
  }

  return (
    <main className="min-h-svh bg-background">
      <div className="px-6 py-6">{children}</div>
    </main>
  );
}
