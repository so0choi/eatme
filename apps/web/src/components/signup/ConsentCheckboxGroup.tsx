import Link from 'next/link';

type ConsentCheckboxGroupProps = {
  error?: string;
};

// 필수 항목(agreeTerms)은 폼 값으로 서버 액션에 전달되고, 미체크 시 제출이 막힌다.
const ConsentCheckboxGroup = ({ error }: ConsentCheckboxGroupProps) => {
  return (
    <div className="rounded-2xl bg-surface-container-low p-4 text-xs text-on-surface-variant">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="agreeTerms"
          required
          aria-invalid={error ? true : undefined}
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
      <label className="mt-3 flex items-start gap-3">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-primary" />
        <span>프로모션, 이벤트 알림을 이메일로 받겠습니다. (선택)</span>
      </label>
      {error && <p className="mt-3 text-tertiary">{error}</p>}
    </div>
  );
};

export default ConsentCheckboxGroup;
