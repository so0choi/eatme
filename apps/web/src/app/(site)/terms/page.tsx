import PolicyDocument, { SUPPORT_EMAIL, type PolicySection } from '@/components/policy/PolicyDocument';

export const metadata = {
  title: '서비스 이용약관 | 냉부',
  description: 'Eat me(냉부) 서비스 이용약관입니다.',
};

const sections: PolicySection[] = [
  {
    title: '목적',
    body: (
      <p>
        이 약관은 Eat me(냉부, 이하 &quot;서비스&quot;)가 제공하는 냉장고 식재료 관리 및 레시피
        추천 서비스의 이용 조건과 절차, 이용자와 서비스의 권리·의무를 정합니다.
      </p>
    ),
  },
  {
    title: '계정',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>이용자는 이메일 또는 Apple·Google 소셜 로그인으로 계정을 만들 수 있습니다.</li>
        <li>계정 정보는 정확하게 입력해야 하며, 계정 관리 책임은 이용자에게 있습니다.</li>
        <li>로그인은 기기별로 관리되며, 로그아웃 시 해당 기기의 세션과 푸시 알림이 해제됩니다.</li>
      </ul>
    ),
  },
  {
    title: '서비스 내용',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>식재료 등록·수정·소비/폐기 기록</li>
        <li>유통기한 임박 알림(푸시)</li>
        <li>보유 재료 기반 레시피 추천</li>
      </ul>
    ),
  },
  {
    title: '이용자의 의무',
    body: (
      <p>
        이용자는 타인의 정보를 도용하거나 서비스 운영을 방해하는 행위를 해서는 안 됩니다.
        레시피 및 유통기한 정보는 참고용이며, 식품 섭취 여부는 이용자가 직접 판단해야 합니다.
      </p>
    ),
  },
  {
    title: '계정 삭제',
    body: (
      <p>
        이용자는 언제든지 설정에서 계정을 삭제할 수 있으며, 삭제 즉시 계정과 등록한 정보가
        삭제되어 복구할 수 없습니다.
      </p>
    ),
  },
  {
    title: '약관의 변경',
    body: (
      <p>
        약관이 변경되는 경우 서비스 내에 공지하며, 필요한 경우 다시 동의를 받습니다.
      </p>
    ),
  },
  {
    title: '문의',
    body: (
      <p>
        서비스 이용 관련 문의는{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary underline-offset-4 hover:underline">
          {SUPPORT_EMAIL}
        </a>
        로 연락해 주세요.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <PolicyDocument
      eyebrow="Terms"
      title="서비스 이용약관"
      effectiveDate="2026년 11월 (초안)"
      intro="서비스를 이용하기 전에 아래 약관을 확인해 주세요. 회원가입 또는 약관 동의 시 이 약관에 동의한 것으로 봅니다."
      sections={sections}
    />
  );
}
