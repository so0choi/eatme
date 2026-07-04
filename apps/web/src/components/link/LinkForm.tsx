'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useActionState } from 'react';
import { linkAccount } from './actions/link';
import { Button } from '@/components/ui/Button';

const providerLabels: Record<string, string> = {
  google: 'Google',
  naver: '네이버',
};

const LinkForm = ({ ticket, provider }: { ticket: string; provider?: string }) => {
  const [state, action, pending] = useActionState(linkAccount, undefined);
  const providerLabel = provider ? providerLabels[provider] ?? provider : '소셜';

  return (
    <section className="flex-1 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
      <h2 className="text-2xl font-semibold text-slate-900">계정 연동</h2>
      <p className="mt-2 text-sm text-slate-500">
        이미 가입된 이메일입니다. 기존 비밀번호를 입력하면 {providerLabel} 로그인을 이
        계정에 연동합니다.
      </p>

      <Form className="mt-8 space-y-5" action={action}>
        <input type="hidden" name="ticket" value={ticket} />
        <div>
          <label htmlFor="password" className="text-sm font-semibold text-slate-700">
            기존 비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        {state?.error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</p>
        )}
        <Button
          type="submit"
          className={'w-full py-4' + (pending ? ' cursor-progress opacity-80' : '')}
        >
          {pending ? '연동 중...' : `${providerLabel} 계정 연동하기`}
        </Button>
      </Form>

      <p className="mt-6 text-sm text-slate-500">
        연동을 원하지 않으면{' '}
        <Link
          href="/login"
          className="font-semibold text-emerald-600 underline-offset-4 hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      </p>
    </section>
  );
};

export default LinkForm;
