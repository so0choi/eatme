import { createUserSchema } from '@eatme/schemas';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../../src/auth/auth-context';
import { authErrorMessage } from '../../src/auth/auth-errors';
import {
  ConsentChecklist,
  type ConsentState,
  EMPTY_CONSENT,
  isConsentComplete,
} from '../../src/auth/consent-checklist';
import { loginWithEmail, signupWithEmail } from '../../src/auth/email-login';
import { ProfileRetryNotice } from '../../src/auth/profile-retry-notice';
import { Button, Notice, Panel, Screen, ScreenHeader, TextField } from '../../src/ui';

type FieldErrors = Partial<Record<'name' | 'email' | 'password', string>>;

export default function Signup() {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState<ConsentState>(EMPTY_CONSENT);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    // 웹·API와 같은 규칙(@eatme/schemas createUserSchema: 이메일 형식, 비밀번호 8자 이상, 약관 동의).
    const parsed = createUserSchema.safeParse({
      name: name.trim(),
      email: email.trim(),
      password,
      agreeTerms: isConsentComplete(consent),
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === 'name' || field === 'email' || field === 'password') && !next[field]) {
          next[field] = issue.message;
        }
        if (field === 'agreeTerms') setError('필수 약관에 모두 동의해 주세요.');
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const { name: n, email: e, password: p } = parsed.data;
      try {
        await signupWithEmail({ name: n, email: e, password: p });
      } catch (err) {
        setError(authErrorMessage(err, '회원가입에 실패했어요.'));
        return;
      }
      try {
        await signIn(await loginWithEmail(e, p));
      } catch (err) {
        setError(`가입은 완료됐어요. 로그인 화면에서 다시 로그인해 주세요. (${authErrorMessage(err, '로그인 실패')})`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader eyebrow="회원가입" title="내 냉장고를 만들어요" description="가입하면 유통기한 알림을 받을 수 있어요." />
      <Panel>
        <TextField
          label="이름"
          value={name}
          onChangeText={setName}
          placeholder="홍길동"
          autoComplete="name"
          textContentType="name"
          error={fieldErrors.name}
        />
        <TextField
          label="이메일"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={fieldErrors.email}
        />
        <TextField
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          placeholder="8자 이상"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          error={fieldErrors.password}
        />
        <ConsentChecklist value={consent} onChange={setConsent} />
        {error ? <Notice message={error} /> : null}
        <ProfileRetryNotice />
        <Button
          label="동의하고 가입하기"
          loading={submitting}
          disabled={!isConsentComplete(consent)}
          onPress={onSubmit}
        />
      </Panel>

      <View className="mt-8 flex-row items-center justify-center gap-1">
        <Text className="text-sm text-on-surface-variant">이미 계정이 있나요?</Text>
        <Link href="/login" className="text-sm font-semibold text-primary">
          로그인
        </Link>
      </View>
    </Screen>
  );
}
