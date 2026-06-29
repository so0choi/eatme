'use client';

import Link from 'next/link';
import TextField from '@/components/form/TextField';
import PreferenceTagPicker from '@/components/signup/PreferenceTagPicker';
import ConsentCheckboxGroup from '@/components/signup/ConsentCheckboxGroup';
import SocialSignupButtons from '@/components/signup/SocialSignupButtons';
import Form from 'next/form';
import { signUp } from '@/components/signup/actions/signup';
import { PREFERENCE_TAGS } from '@/constants/preferences';
import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';

const SignupForm = () => {
  const [state, formAction] = useActionState(signUp, undefined);

  const fieldError = (field: string) => state?.error?.[field]?.[0];

  return (
    <section className="flex-1 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
      <h2 className="text-2xl font-semibold text-slate-900">회원가입</h2>
      <p className="mt-2 text-sm text-slate-500">
        이미 계정이 있다면{' '}
        <Link
          href="/login"
          className="font-semibold text-emerald-600 underline-offset-4 hover:underline"
        >
          로그인
        </Link>
      </p>
      <Form className="mt-8 space-y-5" action={formAction}>
        {fieldError('_form') && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {fieldError('_form')}
          </div>
        )}
        <TextField
          id="name"
          name="name"
          label="닉네임"
          placeholder="냉장고탐험가"
          required
          error={fieldError('name')}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="email"
            name="email"
            type="email"
            label="이메일"
            placeholder="hello@naengbu.com"
            required
            error={fieldError('email')}
          />
          <TextField
            id="phone"
            name="phone"
            type="tel"
            label="연락처 (선택)"
            placeholder="010-0000-0000"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            required
            id="password"
            name="password"
            type="password"
            label="비밀번호"
            placeholder="••••••••"
            error={fieldError('password')}
          />
          <TextField
            required
            id="confirm-password"
            name="confirmPassword"
            type="password"
            label="비밀번호 확인"
            placeholder="••••••••"
            error={fieldError('confirmPassword')}
          />
        </div>
        <PreferenceTagPicker tags={PREFERENCE_TAGS} />
        <ConsentCheckboxGroup />
        <Button type="submit">회원가입 완료</Button>
      </Form>
      <SocialSignupButtons />
      <div className="mt-6 text-center text-xs text-slate-400">
        가입 시 서비스 이용약관과 개인정보처리방침에 동의하게 됩니다.
      </div>
    </section>
  );
};

export default SignupForm;
