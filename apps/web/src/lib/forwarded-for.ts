// Next 서버가 API를 대신 호출할 때 브라우저 IP를 API에 전달하기 위한 x-forwarded-for 값.
//
// 들어온 x-forwarded-for의 왼쪽 값들은 클라이언트가 마음대로 넣을 수 있으므로 체인을 그대로 넘기면
// API rate-limit을 IP 위조로 우회할 수 있다. 그래서 Next 바로 앞의 신뢰된 ingress가 append한
// 맨 오른쪽 값(없으면 ingress가 덮어쓴 x-real-ip) 하나만 넘긴다.
// 이 값도 ingress가 있어야 믿을 수 있으므로, 서버 env `WEB_TRUST_PROXY=true`일 때만 전달한다
// (Next가 인터넷에 직접 노출되면 꺼둘 것 — 기본값 꺼짐).
const trustProxyByDefault = process.env.WEB_TRUST_PROXY === 'true';

export function forwardedFor(
  headers: Pick<Headers, 'get'>,
  trustProxy: boolean = trustProxyByDefault,
): string | undefined {
  if (!trustProxy) return undefined;

  const chain = headers
    .get('x-forwarded-for')
    ?.split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (chain?.length) return chain[chain.length - 1];

  const realIp = headers.get('x-real-ip')?.trim();
  return realIp || undefined;
}
