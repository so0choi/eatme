'use client';

import { logout } from '@/app/actions/logout';
import { Disclosure } from '@headlessui/react';
import { MenuIcon, XIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// 랜딩(비로그인): 마케팅 페이지(/welcome) 내 섹션 앵커
const landingNav = [
  { name: '홈', href: '/welcome' },
  { name: '레시피', href: '/welcome#recipes' },
  { name: '꿀팁', href: '/welcome#community' },
];

// 앱(로그인): 실제 라우트 — 전역 네비게이션 역할
const appNav = [
  { name: '대시보드', href: '/dashboard' },
  { name: '냉장고', href: '/fridge' },
  { name: '레시피', href: '/recipes' },
  { name: '손실 레포트', href: '/insights/waste' },
];

const Navigation: React.FC<{ isLoggedIn: boolean }> = ({ isLoggedIn }) => {
  const navigation = isLoggedIn ? appNav : landingNav;
  const pathname = usePathname();

  // 현재 경로와 일치하는 메뉴 판별. 앵커(#) 메뉴는 스크롤 위치 추적이 필요해 제외.
  const isActive = (href: string) => {
    if (href.includes('#')) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Disclosure
      as="nav"
      className="bg-surface-container-lowest/85 backdrop-blur-sm shadow-ambient sticky top-0 z-50"
    >
      {({ open }) => (
        <>
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <Link href={isLoggedIn ? '/dashboard' : '/welcome'}>
                <div className="flex items-center gap-4">
                  <Image
                    alt="logo"
                    src="/eat_me.png"
                    width={100}
                    height={100}
                    className="w-auto"
                    loading="lazy"
                  />
                </div>
              </Link>
            </div>
            <div className="hidden items-center gap-8 text-sm font-semibold text-on-surface-variant lg:flex">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative transition hover:text-primary ${
                      active ? 'text-primary' : ''
                    }`}
                  >
                    {item.name}
                    {active && (
                      <span className="absolute -bottom-1.5 left-0 h-0.5 w-full rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
              {!isLoggedIn ? (
                <Link
                  href="/login"
                  className="rounded-full bg-primary px-5 py-2 text-on-primary shadow-ambient transition hover:opacity-90"
                >
                  로그인
                </Link>
              ) : (
                <button
                  onClick={logout}
                  className="rounded-full bg-primary px-5 py-2 text-on-primary shadow-ambient transition hover:opacity-90"
                >
                  로그아웃
                </button>
              )}
            </div>
            <div className="lg:hidden">
              <Disclosure.Button className="inline-flex items-center rounded-xl p-2 text-on-surface-variant hover:bg-surface-container focus:outline-none">
                <span className="sr-only">메뉴 열기</span>
                {open ? (
                  <XIcon className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <MenuIcon className="h-6 w-6" aria-hidden="true" />
                )}
              </Disclosure.Button>
            </div>
          </div>
          <Disclosure.Panel className="lg:hidden">
            <div className="space-y-1 px-4 pb-4 pt-2 text-sm text-on-surface-variant">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Disclosure.Button
                    key={item.name}
                    as={Link}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-xl px-3 py-2 hover:bg-surface-container hover:text-primary ${
                      active ? 'bg-surface-container font-semibold text-primary' : ''
                    }`}
                  >
                    {item.name}
                  </Disclosure.Button>
                );
              })}
              {!isLoggedIn ? (
                <Disclosure.Button
                  as={Link}
                  href="/login"
                  className="block rounded-xl bg-primary px-3 py-2 text-center font-semibold text-on-primary mt-2"
                >
                  로그인
                </Disclosure.Button>
              ) : (
                <Disclosure.Button
                  as="button"
                  onClick={logout}
                  className="block w-full rounded-xl bg-primary px-3 py-2 text-center font-semibold text-on-primary mt-2"
                >
                  로그아웃
                </Disclosure.Button>
              )}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default Navigation;
