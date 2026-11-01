import { describe, expect, it } from 'vitest';
import { parseCoupangOrderEmail } from './coupang-email-parser';

// docs/ingredient-intake.md 의 실제 메일 샘플(렌더 텍스트) 구조
const SAMPLE = `
쇼핑하신 내역을 안내해드립니다.
주문번호 1234567890

구매 상세내역              쿠팡가     수량  구매금액   판매자
소금집 관찰레, 120g, 1팩   12,800원   1    12,800원   쿠팡(주)
소금집 잠봉 햄, 120g, 1팩    8,900원   1     8,900원   쿠팡(주)

결제 정보
총 결제금액 21,700원
`;

describe('parseCoupangOrderEmail', () => {
  it('실제 샘플에서 품목·무게·가격을 추출한다', () => {
    expect(parseCoupangOrderEmail(SAMPLE)).toEqual([
      { name: '소금집 관찰레', quantity: 120, unit: 'G', price: 12800, count: 1, raw: '소금집 관찰레, 120g, 1팩' },
      { name: '소금집 잠봉 햄', quantity: 120, unit: 'G', price: 8900, count: 1, raw: '소금집 잠봉 햄, 120g, 1팩' },
    ]);
  });

  it('무게 × 수량 컬럼으로 총량을 계산한다', () => {
    const body = '구매 상세내역\n한돈 삼겹살, 500g   15,000원   2   30,000원   쿠팡(주)\n결제 정보';
    expect(parseCoupangOrderEmail(body)[0]).toMatchObject({ quantity: 1000, unit: 'G', price: 30000, count: 2 });
  });

  it('kg/ml/L 무게 단위를 정규화한다', () => {
    const body = [
      '구매 상세내역',
      '제주 감귤, 3kg   19,900원   1   19,900원   쿠팡(주)',
      '서울우유, 900ml   2,980원   2   5,960원   쿠팡(주)',
      '삼다수, 2L, 6개   6,000원   1   6,000원   쿠팡(주)',
      '결제 정보',
    ].join('\n');
    expect(parseCoupangOrderEmail(body).map(({ quantity, unit }) => ({ quantity, unit }))).toEqual([
      { quantity: 3, unit: 'KG' },
      { quantity: 1800, unit: 'ML' },
      { quantity: 2, unit: 'L' }, // 무게가 팩 수보다 우선
    ]);
  });

  it('무게가 없으면 팩 수 × 수량 컬럼을 EA로 쓴다', () => {
    const body = '구매 상세내역\n유정란, 30구   9,900원   2   19,800원   쿠팡(주)\n결제 정보';
    expect(parseCoupangOrderEmail(body)[0]).toMatchObject({ name: '유정란', quantity: 60, unit: 'EA' });
  });

  it('무게·팩 정보가 모두 없으면 수량 컬럼을 EA로 쓴다', () => {
    const body = '구매 상세내역\n키친타올   5,000원   3   15,000원   쿠팡(주)\n결제 정보';
    expect(parseCoupangOrderEmail(body)[0]).toMatchObject({ name: '키친타올', quantity: 3, unit: 'EA' });
  });

  it('테이블 헤더 이전과 결제 정보 이후의 행은 무시한다', () => {
    const body = [
      '추천상품 사과, 1kg   5,000원   1   5,000원   쿠팡(주)',
      '구매 상세내역',
      '배, 2kg   10,000원   1   10,000원   쿠팡(주)',
      '결제 정보',
      '바나나, 1kg   3,000원   1   3,000원   쿠팡(주)',
    ].join('\n');
    expect(parseCoupangOrderEmail(body).map((i) => i.name)).toEqual(['배']);
  });

  it('CRLF 줄바꿈을 처리한다', () => {
    expect(parseCoupangOrderEmail(SAMPLE.replace(/\n/g, '\r\n'))).toHaveLength(2);
  });

  it('상품 테이블이 없으면 빈 배열', () => {
    expect(parseCoupangOrderEmail('광고 메일입니다')).toEqual([]);
  });
});
