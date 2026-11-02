import { Pressable, Text, View } from 'react-native';
import { Checkbox } from '../ui';
import { openPolicy, type PolicyDocument } from './policy-links';

export type ConsentState = Record<PolicyDocument, boolean>;

export const EMPTY_CONSENT: ConsentState = { terms: false, privacy: false };

export function isConsentComplete(consent: ConsentState): boolean {
  return consent.terms && consent.privacy;
}

const ITEMS: { key: PolicyDocument; label: string }[] = [
  { key: 'terms', label: '[필수] 이용약관 동의' },
  { key: 'privacy', label: '[필수] 개인정보 수집·이용 동의' },
];

/** 필수 약관 체크(전체 동의 + 항목별 동의, 각 문서 보기 링크). 가입·동의 화면에서 함께 쓴다. */
export function ConsentChecklist({ value, onChange }: { value: ConsentState; onChange: (next: ConsentState) => void }) {
  const all = isConsentComplete(value);
  return (
    <View className="gap-2 rounded-2xl bg-surface-container-low p-4">
      <Checkbox
        checked={all}
        onChange={(checked) => onChange({ terms: checked, privacy: checked })}
        label="전체 동의"
      />
      {ITEMS.map((item) => (
        <Checkbox
          key={item.key}
          checked={value[item.key]}
          onChange={(checked) => onChange({ ...value, [item.key]: checked })}
          label={item.label}
          trailing={
            <Pressable accessibilityRole="link" onPress={() => openPolicy(item.key)} hitSlop={8}>
              <Text className="text-sm font-semibold text-primary">보기</Text>
            </Pressable>
          }
        />
      ))}
    </View>
  );
}
