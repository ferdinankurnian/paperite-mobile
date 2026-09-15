import { Tabs } from 'expo-router';

import { useSpace } from '@/lib/SpaceContext';
import { AppHeader } from '@/components/app/AppHeader';
import { ListOptionsProvider } from '@/lib/list-options';
import { SelectionProvider } from '@/lib/selection';

export default function TabLayout() {
  const { activeSpaceName } = useSpace();

  return (
    <SelectionProvider>
      <ListOptionsProvider>
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
      </ListOptionsProvider>
    </SelectionProvider>
  );
}
