import { Text } from 'react-native';
import { Screen } from '../../src/ui';

// 임시 화면: 후속 태스크에서 교체.
export default function Placeholder() {
  return (
    <Screen>
      <Text className="text-on-surface">add</Text>
    </Screen>
  );
}
