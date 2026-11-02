export type RouteState = {
  hasToken: boolean;
  // null = 프로필에 동의 기록 없음(소셜 가입 직후 등)
  termsAgreed: boolean | null;
  onboarded: boolean;
};

export type GuardedRoute = '/(auth)/login' | '/(auth)/consent' | '/onboarding' | '/(tabs)';

// 스펙 §3.2 라우팅 가드: 토큰 → 약관 동의 → 온보딩 순으로 확인한다.
export function resolveRoute({ hasToken, termsAgreed, onboarded }: RouteState): GuardedRoute {
  if (!hasToken) return '/(auth)/login';
  if (termsAgreed !== true) return '/(auth)/consent';
  if (!onboarded) return '/onboarding';
  return '/(tabs)';
}

// 현재 위치(Expo Router segments)가 가드 결과와 맞는지. 맞으면 리다이렉트하지 않는다.
// 로그아웃 상태에서는 (auth) 그룹(동의 화면 제외)과 auth/callback 딥링크를 허용하고,
// 로그인 완료 상태에서는 인증/온보딩 화면 밖이면 어디든(탭, 재료 수정 등) 허용한다.
export function isRouteAllowed(target: GuardedRoute, segments: readonly string[]): boolean {
  const [first, second] = segments;
  switch (target) {
    case '/(auth)/login':
      return (first === '(auth)' && second !== 'consent') || first === 'auth';
    case '/(auth)/consent':
      return first === '(auth)' && second === 'consent';
    case '/onboarding':
      return first === 'onboarding';
    case '/(tabs)':
      return first !== '(auth)' && first !== 'auth' && first !== 'onboarding';
  }
}
