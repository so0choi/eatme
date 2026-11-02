import { Text } from 'react-native';
import { Screen } from '../../../src/ui';

// 임시 화면: 레시피 태스크에서 교체.
export default function RecipesPlaceholder() {
  return (
    <Screen>
      <Text className="text-on-surface">recipes</Text>
    </Screen>
  );
}
