import LoginForm from '@/components/login/LoginForm';

export const metadata = {
  title: '로그인 | 냉부',
  description: '냉장고 식재료 관리와 레시피 추천을 시작하세요.',
};

const errorMessages: Record<string, string> = {
  account_exists:
    '이미 가입된 이메일입니다. 이메일과 비밀번호로 로그인해 주세요.',
  oauth: '소셜 로그인에 실패했습니다. 다시 시도해 주세요.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const notice = error ? errorMessages[error] ?? errorMessages.oauth : undefined;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-16 pt-12 sm:px-6 lg:flex-row lg:px-8 lg:pt-16">
      <section className="flex-1 rounded-3xl bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8 shadow-lg shadow-emerald-200/60">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
          Smart Fridge Manager
        </p>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          로그인하고 냉장고 관리를 시작하세요.
        </h1>
        <p className="mt-4 text-base text-emerald-50 leading-relaxed">
          식재료를 등록하면 유통기한을 자동으로 추적하고, 지금 있는 재료로 만들 수 있는
          레시피를 바로 추천해드려요.
        </p>
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-100">
              유통기한 알림
            </p>
            <p className="mt-2 text-lg font-bold text-white">
              임박 식재료를 미리 알려드려요
            </p>
            <p className="text-sm text-emerald-100">D-3일 전 자동 푸시 알림</p>
          </div>
          <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-100">
              레시피 추천
            </p>
            <p className="mt-2 text-lg font-bold text-white">
              지금 있는 재료로 만드는 오늘의 요리
            </p>
            <p className="text-sm text-emerald-100">3,200개 이상의 레시피 데이터베이스</p>
          </div>
        </div>
      </section>
      <LoginForm notice={notice} />
    </main>
  );
}
