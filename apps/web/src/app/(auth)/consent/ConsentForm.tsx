'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useActionState } from 'react';
import { agreeToTerms } from './actions';
import { logout } from '@/app/actions/logout';

export default function ConsentForm() {
  const [state, action, pending] = useActionState(agreeToTerms, undefined);

  return (
    <section className="flex-1 rounded-3xl bg-surface-container-lowest p-8 shadow-ambient">
      <h2 className="font-display text-2xl font-bold text-on-surface">약관 동의</h2>
      <p className="mt-2 text-sm text-on-surface-variant">
        서비스를 계속 이용하려면 아래 약관에 동의해 주세요.
      </p>

      <Form className="mt-8 space-y-5" action={action}>
        <label className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            name="agreeTerms"
            required
            className="mt-0.5 h-4 w-4 rounded accent-primary"
          />
          <span>
            <Link href="/terms" target="_blank" className="font-semibold text-primary underline-offset-4 hover:underline">
              서비스 이용약관
            </Link>{' '}
            및{' '}
            <Link href="/privacy" target="_blank" className="font-semibold text-primary underline-offset-4 hover:underline">
              개인정보 수집·이용
            </Link>
            에 동의합니다. (필수)
          </span>
        </label>
        {state?.error && (
          <p className="rounded-2xl bg-surface-container px-4 py-3 text-sm text-tertiary">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-primary px-4 py-3 font-semibold text-on-primary shadow-ambient transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-60"
        >
          {pending ? '처리 중...' : '동의하고 시작하기'}
        </button>
      </Form>

      <form action={logout} className="mt-4">
        <button
          type="submit"
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-primary hover:bg-surface-container"
        >
          동의하지 않고 로그아웃
        </button>
      </form>
    </section>
  );
}
