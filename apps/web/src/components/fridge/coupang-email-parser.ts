// 쿠팡 주문완료 메일 → 품목·수량(무게)·가격 추출 (자동입력 방향 A / 쿠팡 어댑터의 파싱 코어)
//
// 대상 메일: 발신 noreply@e.coupang.com, 제목 "[쿠팡] …님 주문하신 내역을 확인해주세요."
// 본문 테이블 구조:  구매 상세내역 | 쿠팡가 | 수량 | 구매금액 | 판매자
//   예) "소금집 관찰레, 120g, 1팩   12,800원   1   12,800원   쿠팡(주)"
// 상품명이 콤마로 "이름, 무게, 팩" 구조라 무게(120g)를 수량으로 뽑아낸다.
//
// 순수 함수(브라우저/Node 무관) — 백엔드 intake 어댑터로 그대로 이식 가능.

import type { ParsedUnit } from './parse-ingredient-input';

export type CoupangItem = {
  name: string; // 정리된 품목명 (예: "소금집 관찰레")
  quantity?: number; // 무게/수량 (무게 우선, 수량 컬럼과 곱함)
  unit?: ParsedUnit;
  price: number; // 구매금액(라인 합계, 원)
  count: number; // 수량 컬럼(팩/개수)
  raw: string; // 원본 상세내역 셀
};

const WEIGHT_UNIT: Record<string, ParsedUnit> = {
  g: 'G',
  그램: 'G',
  kg: 'KG',
  킬로: 'KG',
  키로: 'KG',
  ml: 'ML',
  밀리: 'ML',
  l: 'L',
  리터: 'L',
};

const COUNT_UNITS = ['팩', '개', '구', '봉', '봉지', '알', '마리', '장', '입', '병', '캔', '포', '조각', '미', '박스'];

function toNumber(s: string): number {
  return Number(s.replace(/[,\s]/g, ''));
}

// "120g" → 무게 / "1팩" → 개수 / 그 외 → null (이름 조각)
function parseAmount(seg: string): { value: number; unit: ParsedUnit } | { count: number } | null {
  const m = seg.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z가-힣]+)$/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  const unit = WEIGHT_UNIT[m[2].toLowerCase()];
  if (unit) return { value, unit };
  if (COUNT_UNITS.includes(m[2])) return { count: value };
  return null;
}

// 상세내역 셀 "소금집 관찰레, 120g, 1팩" → { name, weight?, pack? }
function parseDetailCell(cell: string): {
  name: string;
  weight?: { value: number; unit: ParsedUnit };
  pack?: number;
} {
  const parts = cell
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const nameParts: string[] = [];
  let weight: { value: number; unit: ParsedUnit } | undefined;
  let pack: number | undefined;
  for (const part of parts) {
    const amt = parseAmount(part);
    if (amt && 'unit' in amt) weight = amt;
    else if (amt && 'count' in amt) pack = amt.count;
    else nameParts.push(part);
  }
  return { name: nameParts.join(', ').trim() || cell, weight, pack };
}

// 한 상품 행(탭/다중공백 구분): "<상세> <쿠팡가>원 <수량> <구매금액>원 <판매자>"
const ROW_RE = /^(.+?)\s+([\d,]+)\s*원\s+(\d+)\s+([\d,]+)\s*원\s+(.+)$/;

/** 쿠팡 주문완료 메일 본문(텍스트)에서 상품 목록을 추출한다. */
export function parseCoupangOrderEmail(body: string): CoupangItem[] {
  const items: CoupangItem[] = [];
  let inTable = false;

  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (/구매\s*상세내역/.test(t)) {
      inTable = true; // 상품 테이블 헤더 진입
      continue;
    }
    if (!inTable) continue;
    if (/결제\s*정보|총\s*결제금액/.test(t)) break; // 결제 정보 도달 → 종료

    const m = line.match(ROW_RE);
    if (!m) continue;

    const count = parseInt(m[3], 10);
    const lineTotal = toNumber(m[4]);
    const { name, weight, pack } = parseDetailCell(m[1].trim());

    let quantity: number | undefined;
    let unit: ParsedUnit | undefined;
    if (weight) {
      quantity = weight.value * count; // 무게 × 수량
      unit = weight.unit;
    } else if (pack) {
      quantity = pack * count;
      unit = 'EA';
    } else {
      quantity = count;
      unit = 'EA';
    }

    items.push({ name, quantity, unit, price: lineTotal, count, raw: m[1].trim() });
  }

  return items;
}
