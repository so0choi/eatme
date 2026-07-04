// 수동입력 단일 인풋 파서 (기획서 B. 수동입력 모듈)
//
// 템플릿: "품목 수량 가격" — 단, 순서 고정이 아니라 "앵커(단서)로 역할 식별".
//   · 가격 앵커: 원/만/천/백, 또는 마커 없는 순수 숫자
//   · 수량 앵커: 숫자 + 단위 접미사(g/그램/kg/개/구/봉/팩/ml/l...)
//   · 품목:     그 외 남는 토큰
// 여러 줄 입력 시 줄 단위로 여러 품목을 파싱한다.
//
// 예) "감자 500g 3천원" · "감자 500그램 3000" · "우유 2개 2900원" 모두 동일 결과.

export type ParsedUnit = 'EA' | 'G' | 'KG' | 'ML' | 'L';

export type ParsedIngredient = {
  raw: string;
  name: string;
  quantity?: number;
  unit?: ParsedUnit;
  price?: number;
  issues: string[]; // 누락·미인식 등 사용자에게 보여줄 경고
};

// 단위 표기 → enum. 카운트성 단위(개/봉/팩...)는 모두 EA로 수렴.
function normalizeUnit(suffix: string): ParsedUnit | null {
  const s = suffix.toLowerCase();
  if (['kg', '킬로그램', '킬로', '키로', '키로그램'].includes(s)) return 'KG';
  if (['g', '그램', '그람'].includes(s)) return 'G';
  if (['ml', '밀리리터', '밀리'].includes(s)) return 'ML';
  if (['l', '리터'].includes(s)) return 'L';
  if (
    ['개', '구', '봉', '봉지', '팩', '알', '마리', '장', '근', '인분', '포기', '단', '줄', '통', '병', '캔', '박스', '입'].includes(s)
  )
    return 'EA';
  return null;
}

// "500g" → { value: 500, unit: 'G' } / "3천원"·"우유" → null
function tryQuantity(token: string): { value: number; unit: ParsedUnit } | null {
  const match = token.match(/^(\d+(?:\.\d+)?)(.+)$/);
  if (!match) return null;
  const unit = normalizeUnit(match[2]);
  if (!unit) return null;
  return { value: parseFloat(match[1]), unit };
}

// 명시적 금액 마커(원/만/천/백) 포함 여부
function hasMoneyMarker(token: string): boolean {
  return /[원만천백]/.test(token);
}

// "3천원"→3000 · "5만원"→50000 · "1만2천"→12000 · "3,000원"→3000 · "천엽"→null
function koreanMoneyToNumber(token: string): number | null {
  const s = token.replace(/,/g, '').replace(/원/g, '').trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s));

  const re = /(\d+)(만|천|백)/g;
  let total = 0;
  let matched = false;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    matched = true;
    const n = parseInt(m[1], 10);
    total += n * (m[2] === '만' ? 10000 : m[2] === '천' ? 1000 : 100);
    last = re.lastIndex;
  }
  if (!matched) return null;
  const rest = s.slice(last).replace(/[^\d]/g, ''); // "1만2000" 같은 잔여 숫자
  if (rest) total += parseInt(rest, 10);
  return total;
}

// 마커 없는 순수 숫자 ("3000", "3,000", "1.5") → 값. 반올림하지 않아 수량 소수를 보존한다.
function pureNumber(token: string): number | null {
  const s = token.replace(/,/g, '');
  return /^\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
}

// 단위 표기 없이 숫자만 들어온 수량의 기본 단위:
//  · 1~9   → '개'(EA)  : 낱개로 세는 소량으로 간주
//  · 10 이상 → 'g'(G)   : 무게로 다는 대량으로 간주
//  · 명시적 단위가 있으면 이 함수를 타지 않고 그 단위를 따른다.
function defaultUnitForBareQuantity(value: number): ParsedUnit {
  return value >= 10 ? 'G' : 'EA';
}

// 한 줄을 쉼표로 필드 분리. 천단위 쉼표("3,000")는 구분자로 보지 않는다.
function splitFields(line: string): string[] {
  return line
    .split(/(?<!\d),|,(?!\d)/)
    .map((f) => f.trim())
    .filter(Boolean);
}

/**
 * 한 품목(한 줄)을 파싱한다. 필드 구분은 쉼표 또는 띄어쓰기 모두 가능하되,
 * 둘이 함께 있는 "경합" 상황에서는 쉼표를 우선 구분자로 본다.
 *  · 쉼표가 있으면: 첫 필드 = 품목(공백 포함 그대로), 나머지 = 수량/가격
 *  · 쉼표가 없으면: 띄어쓰기로 분류(품목 수량 가격), 미분류 토큰이 품목명
 * 예) "감자 500g 3천원" === "감자, 500g, 3천원".
 */
export function parseLine(raw: string): ParsedIngredient {
  const line = raw.trim();
  const result: ParsedIngredient = { raw, name: '', issues: [] };
  if (!line) {
    result.issues.push('빈 줄');
    return result;
  }

  const bareNumbers: number[] = []; // 마커 없는 순수 숫자를 순서대로 보류
  const nameTokens: string[] = [];

  // 토큰 하나를 수량/가격/순수숫자로 소비. 실패하면 false(=품목 후보).
  const consume = (token: string): boolean => {
    const qty = tryQuantity(token);
    if (qty && result.quantity === undefined) {
      result.quantity = qty.value;
      result.unit = qty.unit;
      return true;
    }
    if (hasMoneyMarker(token)) {
      const price = koreanMoneyToNumber(token);
      if (price !== null && result.price === undefined) {
        result.price = price;
        return true;
      }
    }
    const bare = pureNumber(token);
    if (bare !== null) {
      bareNumbers.push(bare);
      return true;
    }
    return false;
  };

  const fields = splitFields(line);
  if (fields.length > 1) {
    // 경합(쉼표+띄어쓰기 혼용) 시 쉼표 우선: 첫 필드 = 품목, 나머지 = 수량/가격
    result.name = fields[0];
    for (let i = 1; i < fields.length; i++) {
      for (const token of fields[i].split(/\s+/).filter(Boolean)) consume(token);
    }
  } else {
    // 쉼표 없음: 띄어쓰기로 분류. 미분류 토큰이 품목명.
    for (const token of line.split(/\s+/).filter(Boolean)) {
      if (!consume(token)) nameTokens.push(token);
    }
    result.name = nameTokens.join(' ').trim();
  }

  // 보류된 순수 숫자 배정 — "수량 가격" 순서를 존중.
  // 단위 없는 수량은 값 크기로 기본 단위 결정(1~9→개, 10↑→g).
  const queue = [...bareNumbers];
  if (result.quantity === undefined && queue.length >= 2) {
    const q = queue.shift()!;
    result.quantity = q;
    result.unit = defaultUnitForBareQuantity(q);
  }
  if (result.price === undefined && queue.length) {
    result.price = Math.round(queue.shift()!); // 가격은 정수(원)로
  }
  if (result.quantity === undefined && queue.length) {
    const q = queue.shift()!;
    result.quantity = q;
    result.unit = defaultUnitForBareQuantity(q);
  }

  if (!result.name) result.issues.push('품목명을 찾지 못했어요');
  if (result.price === undefined) result.issues.push('가격 없음');
  if (result.quantity === undefined) result.issues.push('수량 없음');

  return result;
}

/** 여러 품목 입력을 파싱한다. 품목은 줄바꿈으로 구분(빈 줄 제외). */
export function parseIngredientInput(text: string): ParsedIngredient[] {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseLine);
}

// 표시용 라벨 헬퍼 (컴포넌트 공용)
export const UNIT_LABEL: Record<ParsedUnit, string> = {
  EA: '개',
  G: 'g',
  KG: 'kg',
  ML: 'ml',
  L: 'l',
};

export function formatQuantity(item: ParsedIngredient): string | null {
  if (item.quantity === undefined || !item.unit) return null;
  return `${item.quantity}${UNIT_LABEL[item.unit]}`;
}

export function formatPrice(item: ParsedIngredient): string | null {
  if (item.price === undefined) return null;
  return `${item.price.toLocaleString()}원`;
}