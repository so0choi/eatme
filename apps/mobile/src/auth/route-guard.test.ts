import { isRouteAllowed, resolveRoute } from './route-guard';

describe('resolveRoute', () => {
  it('토큰이 없으면 로그인 화면', () => {
    expect(resolveRoute({ hasToken: false, termsAgreed: null, onboarded: false })).toBe('/(auth)/login');
    expect(resolveRoute({ hasToken: false, termsAgreed: true, onboarded: true })).toBe('/(auth)/login');
  });

  it('약관 미동의(프로필로 확인)면 동의 화면', () => {
    expect(resolveRoute({ hasToken: true, termsAgreed: false, onboarded: true })).toBe('/(auth)/consent');
    expect(resolveRoute({ hasToken: true, termsAgreed: false, onboarded: false })).toBe('/(auth)/consent');
  });

  it('로그인 상태지만 프로필을 확인하지 못했으면 이동하지 않는다(null)', () => {
    expect(resolveRoute({ hasToken: true, termsAgreed: null, onboarded: true })).toBeNull();
    expect(resolveRoute({ hasToken: true, termsAgreed: null, onboarded: false })).toBeNull();
  });

  it('온보딩 미완이면 온보딩', () => {
    expect(resolveRoute({ hasToken: true, termsAgreed: true, onboarded: false })).toBe('/onboarding');
  });

  it('모두 충족하면 탭 홈', () => {
    expect(resolveRoute({ hasToken: true, termsAgreed: true, onboarded: true })).toBe('/(tabs)');
  });
});

describe('isRouteAllowed', () => {
  it('로그아웃 상태에서는 로그인·가입·연동·콜백 화면에 머문다', () => {
    expect(isRouteAllowed('/(auth)/login', ['(auth)', 'login'])).toBe(true);
    expect(isRouteAllowed('/(auth)/login', ['(auth)', 'signup'])).toBe(true);
    expect(isRouteAllowed('/(auth)/login', ['auth', 'callback'])).toBe(true);
    expect(isRouteAllowed('/(auth)/login', ['(auth)', 'consent'])).toBe(false);
    expect(isRouteAllowed('/(auth)/login', ['(tabs)'])).toBe(false);
    expect(isRouteAllowed('/(auth)/login', [])).toBe(false);
  });

  it('동의·온보딩은 해당 화면만 허용한다', () => {
    expect(isRouteAllowed('/(auth)/consent', ['(auth)', 'consent'])).toBe(true);
    expect(isRouteAllowed('/(auth)/consent', ['(tabs)'])).toBe(false);
    expect(isRouteAllowed('/onboarding', ['onboarding'])).toBe(true);
    expect(isRouteAllowed('/onboarding', ['(tabs)'])).toBe(false);
  });

  it('로그인 완료 상태에서는 인증·온보딩 화면 밖이면 허용한다', () => {
    expect(isRouteAllowed('/(tabs)', ['(tabs)', 'recipes', '[id]'])).toBe(true);
    expect(isRouteAllowed('/(tabs)', ['ingredient', '[id]'])).toBe(true);
    expect(isRouteAllowed('/(tabs)', ['(auth)', 'login'])).toBe(false);
    expect(isRouteAllowed('/(tabs)', ['onboarding'])).toBe(false);
  });
});
