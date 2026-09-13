import { Dimensions, View } from 'react-native';
import { Drawer } from 'expo-router/drawer';

import { AppSidebar } from '@/components/app/AppSidebar';
import { useColorScheme } from '@/lib/useColorScheme';

const SCREEN_W = Dimensions.get('window').width;
const DRAWER_W = Math.min(300, Math.round(SCREEN_W * 0.82));
// full width — swipe buka drawer dari mana aja, bukan cuma edge
const SWIPE_EDGE = SCREEN_W;

export default function DrawerLayout() {
  const { colors, isDarkColorScheme } = useColorScheme();
  // light mode: card (= putih) sama persis kayak background (= putih),
  // radius drawer ketutup karena ga ada kontras. bikin drawer abu dikit
  // biar rounded-nya keliatan. dark mode udah kontras (card #171717 vs bg #0a0a0a).
  const drawerBg = isDarkColorScheme ? colors.card : colors.grey5;

  return (
    <Drawer
      drawerContent={(props) => (
        // wrapper rounded opaque di sini (bukan di drawerStyle): plain View tanpa
        // elevation jadi overflow hidden + radius kepotong bener di android.
        // drawerStyle/drawerContentStyle dibikin transparan biar ga ada rect
        // kotak yang nimpa corner.
        <View
          style={{
            flex: 1,
            backgroundColor: drawerBg,
            borderTopRightRadius: 32,
            borderBottomRightRadius: 32,
            overflow: 'hidden',
          }}>
          <AppSidebar navigation={props.navigation} />
        </View>
      )}
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
          backgroundColor: 'transparent',
          borderTopRightRadius: 32,
          borderBottomRightRadius: 32,
          overflow: 'hidden',
        },
        drawerContentStyle: {
          backgroundColor: 'transparent',
        },
        sceneContainerStyle: {
          backgroundColor: colors.background,
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
