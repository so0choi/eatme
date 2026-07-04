'use client';

import Form from 'next/form';
import Link from 'next/link';
import { login } from './actions/login';
import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const LoginForm = ({ notice }: { notice?: string }) => {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <section className="flex-1 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
      <h2 className="text-2xl font-semibold text-slate-900">계정 로그인</h2>
      {notice && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {notice}
        </p>
      )}
      <p className="mt-2 text-sm text-slate-500">
        아직 계정이 없다면{' '}
        <Link
          href="/signup"
          className="font-semibold text-emerald-600 underline-offset-4 hover:underline"
        >
          회원가입
        </Link>
      </p>
      <Form className="mt-8 space-y-5" action={action}>
        <div>
          <label htmlFor="email" className="text-sm font-semibold text-slate-700">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="hello@naengbu.com"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              비밀번호
            </label>
            <button
              type="button"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              비밀번호 찾기
            </button>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <div className="flex items-center text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="autologin"
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/40"
            />
            로그인 유지
          </label>
        </div>
        {state?.error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</p>
        )}
        <Button
          type="submit"
          className={'w-full py-4' + (pending ? 'cursor-progress opacity-80' : '')}
        >
          {pending ? '로그인 중...' : '로그인'}
        </Button>
      </Form>
      <div className="mt-8 space-y-3 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200" />
          <span>또는</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="grid gap-3">
          <a
            href={`${API_BASE_URL}/auth/naver`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <span className="font-bold">N</span>
            네이버로 시작하기
          </a>
          <a
            href={`${API_BASE_URL}/auth/google`}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span className="font-bold text-[#4285F4]">G</span>
            Google로 시작하기
          </a>
        </div>
      </div>
    </section>
  );
};

export default LoginForm;
