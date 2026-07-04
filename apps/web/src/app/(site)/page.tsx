import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TOKEN_COOKIE } from '@/lib/definitions';

// 루트 진입점: 로그인 상태면 개인 냉장고(대시보드), 아니면 로그인으로.
// 기존 마케팅 랜딩은 /welcome 에 보존.
export default async function HomePage() {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get(TOKEN_COOKIE);

  redirect(isLoggedIn ? '/dashboard' : '/login');
}
