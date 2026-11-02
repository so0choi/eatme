import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { Ingredient } from '../api/documents';
import { Button, Checkbox } from '../ui';

type Props = {
  visible: boolean;
  candidates: Ingredient[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: (selected: Ingredient[]) => void;
};

/** "요리했어요" 바텀 시트: 사용 처리할 냉장고 재료를 체크박스로 고른다(기본 전체 선택). */
export function CookedSheet({ visible, candidates, busy, onCancel, onConfirm }: Props) {
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    if (visible) setChecked(new Set(candidates.map((c) => c.id)));
  }, [visible, candidates]);

  const selected = candidates.filter((c) => checked.has(c.id));
  const toggle = (id: number, on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable accessibilityLabel="닫기" className="flex-1 bg-on-surface/40" onPress={onCancel} />
      <View className="max-h-[70%] gap-4 rounded-t-3xl bg-surface-container-lowest px-6 pb-10 pt-6">
        <Text className="text-xl font-bold text-on-surface">요리했어요</Text>
        {candidates.length === 0 ? (
          <Text className="text-sm text-on-surface-variant">사용 처리할 냉장고 재료가 없어요.</Text>
        ) : (
          <>
            <Text className="text-sm text-on-surface-variant">사용한 재료를 확인해 주세요. 체크 해제하면 그대로 남겨둬요.</Text>
            <ScrollView>
              {candidates.map((c) => (
                <Checkbox key={c.id} label={c.name} checked={checked.has(c.id)} onChange={(on) => toggle(c.id, on)} />
              ))}
            </ScrollView>
          </>
        )}
        <Button
          label={selected.length > 0 ? `${selected.length}개 사용 처리` : '닫기'}
          loading={busy}
          onPress={() => (selected.length > 0 ? onConfirm(selected) : onCancel())}
        />
        {selected.length > 0 ? <Button label="취소" variant="ghost" onPress={onCancel} /> : null}
      </View>
    </Modal>
  );
}
