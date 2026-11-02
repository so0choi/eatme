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
});
