import type { Ingredient } from '../api/documents';
import { activeIngredients, pickIngredientsToUse } from './cooked';

let seq = 0;
const item = (name: string, expireAt: string | null, status: Ingredient['status'] = 'FRESH'): Ingredient => ({
  id: ++seq,
  name,
  price: null,
  quantity: null,
  unit: null,
  expireAt,
  storage: 'FRIDGE',
  status,
  category: null,
  imageUrl: null,
  createdAt: '2026-11-01T00:00:00Z',
});
const recipe = (names: string[], optional: string[] = []) => ({
  ingredients: [...names.map((name) => ({ name })), ...optional.map((name) => ({ name, optional: true }))],
});

describe('activeIngredients', () => {
  it('USED/DISCARDED 제외', () => {
    const list = [item('감자', null), item('양파', null, 'USED'), item('대파', null, 'DISCARDED')];
    expect(activeIngredients(list).map((i) => i.name)).toEqual(['감자']);
  });
});

describe('pickIngredientsToUse', () => {
  it('have 재료와 매칭되는 냉장고 재료만 고른다(부족·optional 제외)', () => {
    const potato = item('감자', '2026-11-10');
    const onion = item('양파', '2026-11-10');
    const picked = pickIngredientsToUse(recipe(['감자', '당근'], ['양파']), [potato, onion]);
    expect(picked).toEqual([potato]);
  });

  it('같은 재료가 여럿이면 유통기한이 가장 빠른 것 1개, 기한 없음은 마지막', () => {
    const none = item('감자', null);
    const late = item('감자', '2026-11-20');
    const soon = item('감자', '2026-11-05');
    expect(pickIngredientsToUse(recipe(['감자']), [none, late, soon])).toEqual([soon]);
    expect(pickIngredientsToUse(recipe(['감자']), [none, late])).toEqual([late]);
    expect(pickIngredientsToUse(recipe(['감자']), [none])).toEqual([none]);
  });

  it('부분 일치("다진 대파")와 공백을 무시한다', () => {
    const scallion = item('다진 대파', '2026-11-08');
    expect(pickIngredientsToUse(recipe(['대파']), [scallion])).toEqual([scallion]);
  });

  it('한 냉장고 재료가 여러 레시피 재료에 중복 선택되지 않는다', () => {
    const soy = item('양조간장', '2026-12-01');
    const picked = pickIngredientsToUse(recipe(['간장', '양조간장']), [soy]);
    expect(picked).toEqual([soy]);
  });

  it('이미 사용/폐기된 재료는 고르지 않는다', () => {
    const used = item('감자', '2026-11-04', 'USED');
    const fresh = item('감자', '2026-11-30');
    expect(pickIngredientsToUse(recipe(['감자']), [used, fresh])).toEqual([fresh]);
    expect(pickIngredientsToUse(recipe(['감자']), [used])).toEqual([]);
  });
});
