import { redirect } from 'next/navigation';
import LinkForm from '@/components/link/LinkForm';

export const metadata = {
  title: '계정 연동 | 냉부',
  description: '기존 계정에 소셜 로그인을 연동하세요.',
};

export default async function LinkPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; provider?: string }>;
}) {
  const { ticket, provider } = await searchParams;

  // 티켓 없이 들어온 경우(직접 접근/만료 링크) 로그인으로 되돌린다.
  if (!ticket) {
    redirect('/login');
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-16 pt-12 sm:px-6 lg:flex-row lg:px-8 lg:pt-16">
      <section className="flex-1 rounded-3xl bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8 shadow-lg shadow-emerald-200/60">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
          Account Linking
        </p>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          하나의 계정으로 모두 로그인하세요.
        </h1>
        <p className="mt-4 text-base text-emerald-50 leading-relaxed">
          이미 이메일로 가입한 계정에 소셜 로그인을 연동하면, 다음부터는 소셜 계정으로도
          바로 로그인할 수 있어요.
        </p>
      </section>
      <LinkForm ticket={ticket} provider={provider} />
    </main>
  );
}
