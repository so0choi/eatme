import { describe, expect, it } from 'vitest';
import { formatPrice, formatQuantity, parseIngredientInput, parseLine } from './parse-ingredient-input';

describe('parseLine', () => {
  it.each(['감자 500g 3천원', '감자 500그램 3000', '감자, 500g, 3천원'])(
    '"%s" → 감자 500g 3000원',
    (input) => {
      expect(parseLine(input)).toMatchObject({ name: '감자', quantity: 500, unit: 'G', price: 3000, issues: [] });
    },
  );

  it('카운트성 단위는 EA로 수렴한다', () => {
    expect(parseLine('우유 2개 2900원')).toMatchObject({ name: '우유', quantity: 2, unit: 'EA', price: 2900 });
    expect(parseLine('라면 5봉 4500원')).toMatchObject({ quantity: 5, unit: 'EA' });
  });

  it('순서가 바뀌어도 앵커로 역할을 식별한다', () => {
    expect(parseLine('3천원 500g 감자')).toMatchObject({ name: '감자', quantity: 500, unit: 'G', price: 3000 });
  });

  it('여러 단어 품목명을 유지한다', () => {
    expect(parseLine('대파 한단 1kg 2500원')).toMatchObject({ name: '대파 한단', quantity: 1, unit: 'KG', price: 2500 });
  });

  it('쉼표 경합 시 첫 필드를 품목명으로 본다 (공백 포함)', () => {
    expect(parseLine('소금집 관찰레, 120g, 12800원')).toMatchObject({
      name: '소금집 관찰레',
      quantity: 120,
      unit: 'G',
      price: 12800,
    });
  });

  describe('금액 표기', () => {
    it.each([
      ['3천원', 3000],
      ['5만원', 50000],
      ['1만2천원', 12000],
      ['1만2000원', 12000],
      ['3,000원', 3000],
      ['3백원', 300],
    ])('%s → %i', (money, expected) => {
      expect(parseLine(`감자 1kg ${money}`).price).toBe(expected);
    });

    it('천단위 쉼표는 필드 구분자로 보지 않는다', () => {
      expect(parseLine('감자, 1kg, 3,000원')).toMatchObject({ name: '감자', price: 3000 });
    });
  });

  describe('단위 없는 순수 숫자', () => {
    it('두 숫자면 "수량 가격" 순서로 배정하고 1~9는 개(EA)', () => {
      expect(parseLine('사과 3 5000')).toMatchObject({ quantity: 3, unit: 'EA', price: 5000 });
    });

    it('10 이상 수량은 g(G)', () => {
      expect(parseLine('돼지고기 600 12000')).toMatchObject({ quantity: 600, unit: 'G', price: 12000 });
    });

    it('숫자 하나는 가격으로 본다', () => {
      const result = parseLine('두부 1500');
      expect(result.price).toBe(1500);
      expect(result.quantity).toBeUndefined();
    });

    it('수량 소수를 보존하고 가격만 반올림한다', () => {
      expect(parseLine('소고기 1.5kg 30000.6')).toMatchObject({ quantity: 1.5, unit: 'KG', price: 30001 });
    });
  });

  describe('issues', () => {
    it('빈 줄', () => {
      expect(parseLine('   ').issues).toEqual(['빈 줄']);
    });

    it('누락 항목을 알린다', () => {
      expect(parseLine('감자').issues).toEqual(['가격 없음', '수량 없음']);
      expect(parseLine('500g 3000원').issues).toEqual(['품목명을 찾지 못했어요']);
    });
  });
});

describe('parseIngredientInput', () => {
  it('줄 단위로 여러 품목을 파싱하고 빈 줄은 건너뛴다', () => {
    const result = parseIngredientInput('감자 500g 3천원\n\n  우유 2개 2900원  \n');
    expect(result.map((r) => r.name)).toEqual(['감자', '우유']);
  });
});

describe('format helpers', () => {
  it('수량/가격 라벨', () => {
    const item = parseLine('감자 500g 3000원');
    expect(formatQuantity(item)).toBe('500g');
    expect(formatPrice(item)).toBe(`${(3000).toLocaleString()}원`);
    expect(formatQuantity(parseLine('감자'))).toBeNull();
    expect(formatPrice(parseLine('감자'))).toBeNull();
  });
});
