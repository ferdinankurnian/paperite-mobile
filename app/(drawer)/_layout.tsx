import { Dimensions } from 'react-native';
import { Drawer } from 'expo-router/drawer';

import { AppSidebar } from '@/components/app/AppSidebar';
import { useColorScheme } from '@/lib/useColorScheme';

const SCREEN_W = Dimensions.get('window').width;
const DRAWER_W = Math.min(300, Math.round(SCREEN_W * 0.82));
// full width — swipe buka drawer dari mana aja, bukan cuma edge
const SWIPE_EDGE = SCREEN_W;

export default function DrawerLayout() {
  const { colors } = useColorScheme();

  return (
    <Drawer
      drawerContent={(props) => <AppSidebar navigation={props.navigation} />}
      screenOptions={{
        headerShown: false,
        // slide = drawer + content ikut gerak, animasi lebih kerasa
        drawerType: 'slide',
        // swipe drawer aman selama dropdown kebuka: menu dirender di Modal
        // (window terpisah), touch nggak nyampe ke gesture drawer.
        swipeEnabled: true,
        swipeEdgeWidth: SWIPE_EDGE,
        swipeMinDistance: 20,
        // biar flick pendek tetap ke-trigger pakai velocity
        swipeMinVelocity: 200,
        drawerStyle: {
          width: DRAWER_W,
          backgroundColor: colors.card,
          borderTopRightRadius: 32,
          borderBottomRightRadius: 32,
          overflow: 'hidden',
        },
        overlayColor: 'rgba(0,0,0,0.4)',
      }}>
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerLabel: 'Home',
          title: 'Home',
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'Settings',
          title: 'Settings',
        }}
      />
    </Drawer>
  );
}
