// 냉장고 라우트는 표 상단 툴바에서 직접 필터링하므로 별도 사이드바 없이 전체 폭을 사용한다.
export default function FridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full">{children}</div>;
}
