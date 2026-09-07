import { Tabs } from 'expo-router';

import { useSpace } from '@/lib/SpaceContext';
import { AppHeader } from '@/components/app/AppHeader';

export default function TabLayout() {
  const { activeSpaceName } = useSpace();

  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader variant="space" />,
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
      }}
      tabBar={() => null}>
      <Tabs.Screen
        name="index"
        options={{
          title: activeSpaceName,
        }}
      />
    </Tabs>
  );
}
