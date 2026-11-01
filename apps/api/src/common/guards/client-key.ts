/**
 * rate-limit 키(클라이언트 식별자). Fastify는 trustProxy 설정 시 `req.ip`에 이미 신뢰된 프록시를
 * 걷어낸 클라이언트 IP를 담으므로 이를 우선한다. 없을 때만 `ips[0]`, 그것도 없으면 'unknown'.
 */
export function clientKey(req: { ip?: string; ips?: string[] }): string {
  return req.ip || req.ips?.[0] || 'unknown';
}

/** TRUST_PROXY env 파싱: 'true'/'false', 홉 수(숫자), 쉼표 구분 CIDR/IP 목록. 미설정이면 off. */
export function parseTrustProxy(
  raw: string | undefined,
): boolean | number | string[] {
  const v = raw?.trim();
  if (!v || v === 'false') return false;
  if (v === 'true') return true;
  if (/^\d+$/.test(v)) return Number(v);
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 양의 유한수가 아니면 기본값. */
export function positiveNumber(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
