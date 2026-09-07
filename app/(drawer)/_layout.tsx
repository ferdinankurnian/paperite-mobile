import { Dimensions } from 'react-native';
import { Drawer } from 'expo-router/drawer';

import { AppSidebar } from '@/components/app/AppSidebar';
import { useDrawerLock } from '@/lib/DrawerLockContext';
import { useColorScheme } from '@/lib/useColorScheme';

const SCREEN_W = Dimensions.get('window').width;
const DRAWER_W = Math.min(300, Math.round(SCREEN_W * 0.82));
// full width — swipe buka drawer dari mana aja, bukan cuma edge
const SWIPE_EDGE = SCREEN_W;

export default function DrawerLayout() {
  const { colors } = useColorScheme();
  // dikunci pas overlay top-level (dropdown menu) kebuka — overlay transparan
  // nggak bisa nge-block drawer swipe gesture, jadi swipe-nya dimatiin.
  const { locked } = useDrawerLock();
  // TODO(probe): hapus log ini kalo bug drawer udah kelar
  console.log('[drawer-lock] drawer render, locked:', locked, 'swipeEnabled:', !locked);

  return (
    <Drawer
      drawerContent={(props) => <AppSidebar navigation={props.navigation} />}
      screenOptions={{
        headerShown: false,
        // slide = drawer + content ikut gerak, animasi lebih kerasa
        drawerType: 'slide',
        swipeEnabled: !locked,
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
    </Drawer>
  );
}
