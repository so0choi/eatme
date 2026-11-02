import type { Ingredient } from '../api/documents';
import { groupIngredients } from './group-ingredients';

const NOW = new Date('2026-11-03T03:00:00Z'); // KST 12:00
const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000).toISOString();

let seq = 0;
const item = (over: Partial<Ingredient>): Ingredient => ({
  id: ++seq,
  name: `재료${seq}`,
  price: null,
  quantity: null,
  unit: null,
  expireAt: day(10),
  storage: 'FRIDGE',
  status: 'FRESH',
  category: null,
  imageUrl: null,
  createdAt: day(-1),
  ...over,
});

describe('groupIngredients', () => {
  it('USED/DISCARDED는 제외한다', () => {
    const g = groupIngredients([item({ status: 'USED' }), item({ status: 'DISCARDED' }), item({})], NOW);
    expect(g.byStorage.FRIDGE).toHaveLength(1);
  });

  it('임박(0~3일)은 daysLeft 오름차순으로 모은다', () => {
    const a = item({ name: 'a', expireAt: day(3) });
    const b = item({ name: 'b', expireAt: day(0) });
    const c = item({ name: 'c', expireAt: day(1) });
    const far = item({ name: 'far', expireAt: day(4) });
    const g = groupIngredients([a, far, b, c], NOW);
    expect(g.expiringSoon.map((i) => i.name)).toEqual(['b', 'c', 'a']);
  });

  it('이미 지난 재료는 임박 섹션이 아니라 보관 목록 맨 앞에 둔다', () => {
    const expired = item({ name: 'old', expireAt: day(-2), status: 'EXPIRED' });
    const fresh = item({ name: 'fresh', expireAt: day(5) });
    const g = groupIngredients([fresh, expired], NOW);
    expect(g.expiringSoon).toEqual([]);
    expect(g.byStorage.FRIDGE.map((i) => i.name)).toEqual(['old', 'fresh']);
  });

  it('보관 위치별로 나누고 유통기한 없는 재료는 뒤로 보낸다', () => {
    const none = item({ name: 'none', storage: 'PANTRY', expireAt: null });
    const soon = item({ name: 'soon', storage: 'PANTRY', expireAt: day(2) });
    const frozen = item({ name: 'ice', storage: 'FREEZER', expireAt: day(30) });
    const g = groupIngredients([none, soon, frozen], NOW);
    expect(g.byStorage.PANTRY.map((i) => i.name)).toEqual(['soon', 'none']);
    expect(g.byStorage.FREEZER.map((i) => i.name)).toEqual(['ice']);
    expect(g.byStorage.FRIDGE).toEqual([]);
  });
});
