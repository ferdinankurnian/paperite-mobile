import { Tabs } from 'expo-router';

import { useSpace } from '@/lib/SpaceContext';
import { NotesHeader } from '@/components/NotesHeader';

export default function TabLayout() {
  const { activeSpaceName } = useSpace();

  return (
    <Tabs
      screenOptions={{
        header: () => <NotesHeader />,
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
