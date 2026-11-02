const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 시각을 KST 달력 날짜(자정 UTC 기준 일 번호)로 변환. 머신 타임존과 무관하다. */
function kstDayNumber(date: Date): number {
  return Math.floor((date.getTime() + KST_OFFSET_MS) / DAY_MS);
}

/** KST(Asia/Seoul) 달력 기준 남은 일수. 오늘=0, 내일=1, 어제=-1. */
export function daysLeft(expireAt: Date | string, now: Date = new Date()): number {
  const target = typeof expireAt === 'string' ? new Date(expireAt) : expireAt;
  return kstDayNumber(target) - kstDayNumber(now);
}

/** 유통기한이 오늘부터 3일 이내(0~3일)인지. */
export function isExpiringSoon(expireAt: Date | string, now: Date = new Date()): boolean {
  const left = daysLeft(expireAt, now);
  return left >= 0 && left <= 3;
}
