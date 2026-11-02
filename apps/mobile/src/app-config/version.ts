import type { AppConfig } from '../api/documents';

export type UpdateState = 'force' | 'suggest' | 'none';

function parts(version: string): number[] {
  return version
    .trim()
    .split('.')
    .map((p) => {
      const n = Number.parseInt(p, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

/** 점으로 구분된 숫자 버전을 비교한다. 자릿수가 다르면 빠진 자리를 0으로 본다. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = parts(a);
  const pb = parts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

/**
 * 스펙 §5 appConfig: min 미만이면 강제 업데이트, latest 미만이면 1회 안내.
 * 설정을 못 받으면(오프라인 등) 사용자를 막지 않도록 none.
 */
export function updateState(
  current: string,
  config: Pick<AppConfig, 'minSupportedVersion' | 'latestVersion'> | null | undefined,
): UpdateState {
  if (!config) return 'none';
  if (compareVersions(current, config.minSupportedVersion) < 0) return 'force';
  if (compareVersions(current, config.latestVersion) < 0) return 'suggest';
  return 'none';
}
