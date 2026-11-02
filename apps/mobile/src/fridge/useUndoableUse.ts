import { useCallback, useEffect, useRef, useState } from 'react';
import type { Ingredient, IngredientStatus } from '../api/documents';

export const UNDO_WINDOW_MS = 5000;

export type PendingUse = { id: number; name: string; previousStatus: IngredientStatus };

type SetStatus = (id: number, status: IngredientStatus) => Promise<unknown>;

/**
 * 스와이프 "사용함": 즉시 목록에서 숨기고(낙관적) 서버에 USED를 보낸다.
 * 5초 안에 undo()하면 이전 status로 되돌리고, 서버 실패 시에도 숨김을 풀고 error를 남긴다.
 * 폐기는 실행취소를 제공하지 않으므로 이 훅과 무관하다(스펙 §3.3).
 */
export function useUndoableUse(setStatus: SetStatus) {
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<number>>(new Set());
  const [pending, setPending] = useState<PendingUse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const unhide = useCallback((id: number) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const use = useCallback(
    async (item: Pick<Ingredient, 'id' | 'name' | 'status'>) => {
      clearTimer();
      setError(null);
      setHiddenIds((prev) => new Set(prev).add(item.id));
      setPending({ id: item.id, name: item.name, previousStatus: item.status });
      timer.current = setTimeout(() => setPending(null), UNDO_WINDOW_MS);
      try {
        await setStatus(item.id, 'USED');
      } catch {
        unhide(item.id);
        setPending((p) => (p?.id === item.id ? null : p));
        setError('사용 처리에 실패했어요. 다시 시도해 주세요.');
      }
    },
    [setStatus, unhide],
  );

  const undo = useCallback(async () => {
    if (!pending) return;
    const target = pending;
    clearTimer();
    setPending(null);
    try {
      await setStatus(target.id, target.previousStatus);
      unhide(target.id);
    } catch {
      // 되돌리기 실패: 서버는 USED 그대로이므로 숨김을 유지하고 알린다.
      setError('실행취소에 실패했어요. 다시 시도해 주세요.');
    }
  }, [pending, setStatus, unhide]);

  return { use, undo, pending, hiddenIds, error };
}
