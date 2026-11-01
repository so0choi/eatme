import Link from 'next/link';

export const SUPPORT_EMAIL = 'support@eatme.app';

export type PolicySection = {
  title: string;
  body: React.ReactNode;
};

type PolicyDocumentProps = {
  eyebrow: string;
  title: string;
  effectiveDate: string;
  intro: string;
  sections: PolicySection[];
};

// 정책 페이지 공통 레이아웃. 초안이므로 상단에 "법률 검토 필요" 배너를 노출한다.
export default function PolicyDocument({
  eyebrow,
  title,
  effectiveDate,
  intro,
  sections,
}: PolicyDocumentProps) {
  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <div
          role="note"
          className="rounded-2xl bg-tertiary-container/15 px-5 py-4 text-sm text-tertiary"
        >
          <strong className="font-semibold">법률 검토 필요</strong> · 이 문서는 초안이며
          법률 검토 후 확정됩니다.
        </div>

        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.05rem] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-on-surface">{title}</h1>
        <p className="mt-3 text-sm text-on-surface-variant">시행일: {effectiveDate}</p>
        <p className="mt-6 text-sm leading-relaxed text-on-surface-variant">{intro}</p>

        <div className="mt-10 space-y-4 rounded-3xl bg-surface-container-low p-4 sm:p-6">
          {sections.map((section, index) => (
            <section
              key={section.title}
              className="rounded-2xl bg-surface-container-lowest px-5 py-5"
            >
              <h2 className="font-display text-lg font-semibold text-on-surface">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-on-surface-variant">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <nav className="mt-10 flex flex-wrap gap-2 text-sm">
          <Link href="/terms" className="rounded-2xl px-4 py-3 font-semibold text-primary hover:bg-surface-container">
            서비스 이용약관
          </Link>
          <Link href="/privacy" className="rounded-2xl px-4 py-3 font-semibold text-primary hover:bg-surface-container">
            개인정보 처리방침
          </Link>
          <Link href="/" className="rounded-2xl px-4 py-3 font-semibold text-primary hover:bg-surface-container">
            홈으로
          </Link>
        </nav>
      </div>
    </main>
  );
}
