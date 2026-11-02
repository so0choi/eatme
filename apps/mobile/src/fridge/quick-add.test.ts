import { parseIngredientInput } from '@eatme/core';
import { buildCreateInputs, planQuickAdd, summarizeSave } from './quick-add';

describe('buildCreateInputs', () => {
  it('보관·카테고리·유통기한을 규칙에서 자동 채운다', () => {
    const [input] = buildCreateInputs(parseIngredientInput('우유 1개 2500원'));
    expect(input).toMatchObject({ name: '우유', quantity: 1, unit: 'EA', price: 2500, storage: 'FRIDGE', category: 'DAIRY' });
    expect(new Date(input.expireAt as string).getTime()).toBeGreaterThan(Date.now());
  });

  it('규칙이 없는 품목은 냉장/기타, 유통기한 없음', () => {
    const [input] = buildCreateInputs(parseIngredientInput('zzqx'));
    expect(input).toMatchObject({ name: 'zzqx', storage: 'FRIDGE', category: 'ETC' });
    expect(input.expireAt).toBeUndefined();
  });

  it('override가 자동 추정보다 우선하고 유통기한은 override 보관 기준으로 다시 계산한다', () => {
    const lines = parseIngredientInput('우유 1개');
    const auto = buildCreateInputs(lines)[0];
    const over = buildCreateInputs(lines, {
      storage: { [lines[0].raw]: 'FREEZER' },
      category: { [lines[0].raw]: 'SNACK' },
    })[0];
    expect(over.storage).toBe('FREEZER');
    expect(over.category).toBe('SNACK');
    expect(over.expireAt).not.toBe(auto.expireAt);
  });

  it('품목이 비어 있는 라인은 invalidLines로 분리한다', () => {
    const lines = parseIngredientInput('감자 500g\n3000원');
    const plan = planQuickAdd(lines);
    expect(plan.valid.map((v) => v.input.name)).toEqual(['감자']);
    expect(plan.invalidLines).toEqual([lines[1].raw]);
  });
});

describe('summarizeSave', () => {
  it('실패한 라인과 검증 실패 라인만 남긴다', () => {
    const lines = parseIngredientInput('감자 500g\n우유 1개\n양파 2개\n3000원');
    const plan = planQuickAdd(lines);
    const err = new Error('boom');
    const result = summarizeSave(plan, [
      { status: 'fulfilled', value: {} },
      { status: 'rejected', reason: err },
      { status: 'fulfilled', value: {} },
    ]);
    expect(result.savedCount).toBe(2);
    expect(result.remainingLines).toEqual([lines[3].raw, lines[1].raw]);
    expect(result.firstError).toBe(err);
  });

  it('전부 성공하면 남는 라인이 없다', () => {
    const plan = planQuickAdd(parseIngredientInput('감자\n우유'));
    const r = summarizeSave(plan, [{ status: 'fulfilled', value: 1 }, { status: 'fulfilled', value: 2 }]);
    expect(r).toMatchObject({ savedCount: 2, remainingLines: [] });
  });
});
