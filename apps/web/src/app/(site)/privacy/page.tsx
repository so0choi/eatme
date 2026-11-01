import PolicyDocument, { SUPPORT_EMAIL, type PolicySection } from '@/components/policy/PolicyDocument';

export const metadata = {
  title: '개인정보 처리방침 | 냉부',
  description: 'Eat me(냉부) 서비스의 개인정보 처리방침입니다.',
};

const sections: PolicySection[] = [
  {
    title: '수집하는 개인정보 항목',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>계정 정보: 이메일, 이름(닉네임)</li>
        <li>서비스 이용 정보: 등록한 식재료(이름·수량·보관 위치·유통기한)와 구매 가격</li>
        <li>알림 정보: 푸시 알림 토큰</li>
        <li>기기 정보: 기기 플랫폼(web / iOS / Android)</li>
      </ul>
    ),
  },
  {
    title: '수집·이용 목적',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>회원 식별 및 로그인(이메일, Apple·Google 소셜 로그인)</li>
        <li>개인 냉장고 식재료 관리, 유통기한 알림, 보유 재료 기반 레시피 추천</li>
        <li>기기별 로그인 세션 관리 및 푸시 알림 발송</li>
      </ul>
    ),
  },
  {
    title: '보유 및 이용 기간',
    body: (
      <p>
        회원 탈퇴(계정 삭제) 시 수집한 개인정보와 등록한 식재료 정보는 유예 기간 없이 즉시
        삭제됩니다. 단, 관계 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.
      </p>
    ),
  },
  {
    title: '개인정보 처리위탁',
    body: (
      <>
        <p>원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>호스팅 사업자: 서버 운영 및 데이터 보관</li>
          <li>Expo: 모바일 푸시 알림 발송</li>
          <li>Sentry: 앱 오류 및 성능 모니터링</li>
          <li>Apple / Google: 소셜 로그인 인증</li>
        </ul>
      </>
    ),
  },
  {
    title: '이용자의 권리',
    body: (
      <p>
        이용자는 언제든지 앱 또는 웹의 설정에서 자신의 정보를 조회·수정하거나 계정을 삭제할
        수 있으며, 푸시 알림 수신을 중단할 수 있습니다.
      </p>
    ),
  },
  {
    title: '문의처',
    body: (
      <p>
        개인정보 관련 문의는{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary underline-offset-4 hover:underline">
          {SUPPORT_EMAIL}
        </a>
        로 연락해 주세요.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <PolicyDocument
      eyebrow="Privacy"
      title="개인정보 처리방침"
      effectiveDate="2026년 11월 (초안)"
      intro="Eat me(냉부)는 개인 냉장고 식재료 관리 서비스를 제공하기 위해 필요한 최소한의 개인정보만 수집하며, 관련 법령을 준수합니다."
      sections={sections}
    />
  );
}
