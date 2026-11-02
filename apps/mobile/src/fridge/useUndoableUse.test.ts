import { act, renderHook } from '@testing-library/react-native';
import type { IngredientStatus } from '../api/documents';
import { UNDO_WINDOW_MS, useUndoableUse } from './useUndoableUse';

const milk = { id: 1, name: '우유', status: 'EXPIRING_SOON' as IngredientStatus };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useUndoableUse', () => {
  it('사용함은 즉시 숨기고 USED로 보낸다', async () => {
    const setStatus = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() => useUndoableUse(setStatus));
    await act(async () => {
      await result.current.use(milk);
    });
    expect(setStatus).toHaveBeenCalledWith(1, 'USED');
    expect(result.current.hiddenIds.has(1)).toBe(true);
    expect(result.current.pending?.name).toBe('우유');
  });

  it('5초 안에 취소하면 이전 status로 되돌리고 다시 보인다', async () => {
    const setStatus = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() => useUndoableUse(setStatus));
    await act(async () => {
      await result.current.use(milk);
    });
    await act(async () => {
      jest.advanceTimersByTime(UNDO_WINDOW_MS - 1);
    });
    expect(result.current.pending).not.toBeNull();
    await act(async () => {
      await result.current.undo();
    });
    expect(setStatus).toHaveBeenLastCalledWith(1, 'EXPIRING_SOON');
    expect(result.current.hiddenIds.has(1)).toBe(false);
    expect(result.current.pending).toBeNull();
  });

  it('5초가 지나면 토스트가 사라진다', async () => {
    const setStatus = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() => useUndoableUse(setStatus));
    await act(async () => {
      await result.current.use(milk);
    });
    await act(async () => {
      jest.advanceTimersByTime(UNDO_WINDOW_MS);
    });
    expect(result.current.pending).toBeNull();
    expect(result.current.hiddenIds.has(1)).toBe(true);
  });

  it('서버 실패 시 원복하고 오류를 알린다', async () => {
    const setStatus = jest.fn().mockRejectedValue(new Error('network'));
    const { result } = await renderHook(() => useUndoableUse(setStatus));
    await act(async () => {
      await result.current.use(milk);
    });
    expect(result.current.hiddenIds.has(1)).toBe(false);
    expect(result.current.pending).toBeNull();
    expect(result.current.error).toMatch(/실패/);
  });

  it('USED 요청이 끝나기 전에 취소해도 USED가 먼저, 복원이 나중에 전송된다', async () => {
    const calls: string[] = [];
    let resolveUsed: () => void = () => {};
    const setStatus = jest.fn((_id: number, status: IngredientStatus) => {
      calls.push(status);
      if (status === 'USED') return new Promise<void>((r) => (resolveUsed = r));
      return Promise.resolve();
    });
    const { result } = await renderHook(() => useUndoableUse(setStatus));
    let usePromise: Promise<void> = Promise.resolve();
    await act(async () => {
      usePromise = result.current.use(milk);
    });
    let undoPromise: Promise<void> = Promise.resolve();
    await act(async () => {
      undoPromise = result.current.undo();
    });
    expect(calls).toEqual(['USED']);
    await act(async () => {
      resolveUsed();
      await usePromise;
      await undoPromise;
    });
    expect(calls).toEqual(['USED', 'EXPIRING_SOON']);
    expect(result.current.hiddenIds.has(1)).toBe(false);
  });

  it('USED가 실패했다면 취소해도 복원 요청을 보내지 않는다', async () => {
    let rejectUsed: (e: Error) => void = () => {};
    const setStatus = jest.fn(() => new Promise<void>((_, rej) => (rejectUsed = rej)));
    const { result } = await renderHook(() => useUndoableUse(setStatus));
    let usePromise: Promise<void> = Promise.resolve();
    await act(async () => {
      usePromise = result.current.use(milk);
    });
    let undoPromise: Promise<void> = Promise.resolve();
    await act(async () => {
      undoPromise = result.current.undo();
    });
    await act(async () => {
      rejectUsed(new Error('x'));
      await usePromise;
      await undoPromise;
    });
    expect(setStatus).toHaveBeenCalledTimes(1);
    expect(result.current.hiddenIds.has(1)).toBe(false);
  });

  it('다른 재료를 이어서 사용하면 앞 항목은 확정되고 토스트는 새 항목을 가리킨다', async () => {
    const setStatus = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() => useUndoableUse(setStatus));
    await act(async () => {
      await result.current.use(milk);
    });
    await act(async () => {
      await result.current.use({ id: 2, name: '두부', status: 'FRESH' });
    });
    expect(result.current.pending?.id).toBe(2);
    await act(async () => {
      await result.current.undo();
    });
    expect(setStatus).toHaveBeenLastCalledWith(2, 'FRESH');
    expect(result.current.hiddenIds.has(1)).toBe(true);
    expect(result.current.hiddenIds.has(2)).toBe(false);
  });
});
