import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../src/ui/colors';

const glyph = (g: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{g}</Text>
);

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen name="index" options={{ title: '냉장고', tabBarIcon: glyph('🧊') }} />
      <Tabs.Screen name="add" options={{ title: '추가', tabBarIcon: glyph('➕') }} />
      <Tabs.Screen name="recipes" options={{ title: '레시피', tabBarIcon: glyph('🍳') }} />
      <Tabs.Screen name="insights" options={{ title: '인사이트', tabBarIcon: glyph('📊') }} />
      <Tabs.Screen name="settings" options={{ title: '설정', tabBarIcon: glyph('⚙️') }} />
    </Tabs>
  );
}
