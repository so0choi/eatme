// Next 서버가 API를 대신 호출할 때 브라우저 IP를 API에 전달하기 위한 x-forwarded-for 값.
// API는 TRUST_PROXY로 Next 서버(및 앞단 ingress) 홉을 신뢰해야 req.ip가 브라우저 IP로 풀린다.
// 들어온 요청의 x-forwarded-for 체인(Next/ingress가 이미 붙인 값)을 그대로 넘기고,
// 없으면 x-real-ip를 쓴다. 둘 다 없으면 undefined(헤더 생략).
export function forwardedFor(
  headers: Pick<Headers, 'get'>,
): string | undefined {
  const chain = headers
    .get('x-forwarded-for')
    ?.split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (chain?.length) return chain.join(', ');

  const realIp = headers.get('x-real-ip')?.trim();
  return realIp || undefined;
}
