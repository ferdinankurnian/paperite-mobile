import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type ViewProps,
} from 'react-native';

import { ToolbarItem, TOOLBAR_ITEM_SIZE, type ToolbarIconName } from './Toolbar';
import { useDrawerLock } from '@/lib/DrawerLockContext';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

export type ToolbarMenuAction = {
  title: string;
  icon: ToolbarIconName;
  accessibilityLabel?: string;
  onPress?: () => void;
};

type ToolbarMenuProps = {
  actions: ToolbarMenuAction[];
  accessibilityLabel?: string;
};

const MENU_WIDTH = 224;
const MENU_PADDING = 6;
const ITEM_RADIUS = 10;
// outer = inner + padding → 10 + 6 = 16
const MENU_RADIUS = ITEM_RADIUS + MENU_PADDING;
const MENU_ITEM_H = 48;

// origin animasi horizontal, diukur dari posisi trigger
type MenuOrigin = 'left' | 'center' | 'right';
// closed → entering → exiting → closed. exiting nahan unmount biar sempet
// mainin animasi keluar (primitive aslinya langsung unmount pas close).
type MenuPhase = 'closed' | 'entering' | 'exiting';
const ENTER_SCALE = 0.8;
const ENTER_SLIDE_Y = -4;
const EXIT_SCALE = 0.9;
const EXIT_SLIDE_Y = -3;
const EXIT_DURATION = 130;

export function ToolbarMenu({ actions, accessibilityLabel = 'More options' }: ToolbarMenuProps) {
  const { colors } = useColorScheme();
  const { setLocked } = useDrawerLock();
  const triggerRef = useRef<View>(null);
  const [origin, setOrigin] = useState<MenuOrigin>('right');
  const [phase, setPhase] = useState<MenuPhase>('closed');
  // forceMount cuma pas menu hidup (entering/exiting) — pas closed tree-nya
  // unmount bersih kayak biasa, nggak nge-block touch.
  const mounted = phase !== 'closed';

  // menu kebuka = drawer swipe dikunci (overlay transparan nggak bisa
  // nge-block drawer gesture). cleanup biar nggak nyangkut kalo unmount.
  useEffect(() => {
    // TODO(probe): hapus log ini kalo bug drawer udah kelar
    console.log('[drawer-lock] menu mounted:', mounted);
    setLocked(mounted);
    return () => setLocked(false);
  }, [mounted, setLocked]);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // trigger udah ke-layout (lagi keliatan), jadi bisa langsung diukur
      triggerRef.current?.measure((_x, _y, width, _h, pageX) => {
        const screenW = Dimensions.get('window').width;
        const centerX = pageX + width / 2;
        setOrigin(centerX < screenW / 3 ? 'left' : centerX > (screenW * 2) / 3 ? 'right' : 'center');
      });
      setPhase('entering');
    } else {
      // close dari primitive (trigger toggle / hardware back / escape):
      // tahan unmount, mainin exit animation dulu. echo dari node.close()
      // pas phase udah 'closed' di-ignore sama guard ini.
      setPhase((p) => (p === 'closed' ? p : 'exiting'));
    }
  };

  const startDismiss = () => {
    setPhase((p) => (p === 'closed' ? p : 'exiting'));
  };

  // exit kelar → sync close ke primitive (clear posisi + internal open),
  // baru unmount. timeout jadi safety net: kalo tree keburu unmount duluan
  // (mis. hardware back nge-clear posisi), phase nggak nyangkut di exiting.
  useEffect(() => {
    if (phase !== 'exiting') return;
    const t = setTimeout(() => {
      (triggerRef.current as unknown as { close?: () => void } | null)?.close?.();
      setPhase('closed');
    }, EXIT_DURATION + 60);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <DropdownMenuPrimitive.Root onOpenChange={handleOpenChange}>
      <DropdownMenuPrimitive.Trigger asChild>
        <ToolbarItem
          ref={triggerRef}
          hitSlop={12}
          icon="more-vert"
          accessibilityLabel={accessibilityLabel}
        />
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal forceMount={mounted ? true : undefined}>
        <DropdownMenuPrimitive.Overlay
          forceMount={mounted ? true : undefined}
          // close-nya kita yang pegang (startDismiss → exit anim → close),
          // biar posisi trigger nggak di-clear sebelum animasi kelar.
          closeOnPress={false}
          onPress={startDismiss}
          style={styles.overlay}>
          <DropdownMenuPrimitive.Content
            align="end"
            side="bottom"
            // offset negatif = narik menu ke atas nutupin trigger
            sideOffset={-TOOLBAR_ITEM_SIZE}
            asChild
            forceMount={mounted ? true : undefined}
            style={{
              flexDirection: 'column',
              borderWidth: 1,
              borderRadius: MENU_RADIUS,
              padding: MENU_PADDING,
              gap: 2,
              overflow: 'hidden',
              // shadow ios + elevation android, biar floating kayak toolbar
              elevation: 8,
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              width: MENU_WIDTH,
              backgroundColor: colors.card,
              borderColor: withOpacity(colors.border, 0.9),
              shadowColor: '#000',
            }}>
            {/* asChild: positioning + container style dari primitive di-merge
                ke Animated.View via Slot. mount = entering, unmount = closed,
                jadi enter jalan tiap buka & exit ketahan sampe animasi kelar. */}
            <AnimatedMenuContent origin={origin} phase={phase}>
              {actions.map((action) => (
              // asChild: Slot-nya primitive nempelin behavior nutup-menu +
              // accessibility ke MenuItemButton. ripple di android nggak mau
              // ke-clip sama radius di Pressable yang sama, jadi yang megang
              // radius + overflow:hidden itu outer View statis (trik
              // outer = inner + padding), Pressable duduk di dalamnya.
              <DropdownMenuPrimitive.Item
                key={action.accessibilityLabel ?? action.title}
                asChild
                textValue={action.title}
                // close-nya kita yang pegang via onDismiss (lihat bawah),
                // biar posisi trigger nggak di-clear sebelum exit anim kelar.
                closeOnPress={false}
                onPress={action.onPress}>
                <MenuItemButton onDismiss={startDismiss}>
                  <View style={styles.itemIcon}>
                    <MaterialIcons name={action.icon} size={22} color={colors.foreground} />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.itemLabel, { color: colors.foreground }]}>
                    {action.title}
                  </Text>
                </MenuItemButton>
              </DropdownMenuPrimitive.Item>
            ))}
            </AnimatedMenuContent>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Overlay>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

type MenuItemButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  onDismiss?: () => void;
};

type AnimatedMenuContentProps = {
  origin: MenuOrigin;
  phase: MenuPhase;
  children: ReactNode;
} & ViewProps;

// Slot child buat Content asChild: positioning + container style dari
// primitive di-merge ke Animated.View ini. mount = menu kebuka, jadi enter
// animation jalan tiap buka. RN nggak ada transform-origin, jadi origin
// di-fake pake kompensasi translate:
// - horizontal (kiri/kanan): scale s ngecilin dari tengah → tepi geser
//   (1-s)*W/2, tinggal balikin.
// - vertikal: menu selalu kebuka ke bawah trigger → origin top. tepi atas
//   geser turun (1-s)*H/2 pas ngecil, balikin ke atas. H diukur beneran
//   via onLayout karena tinggi menu dinamis ngikutin jumlah item.
function AnimatedMenuContent({ origin, phase, children, style, ...props }: AnimatedMenuContentProps) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(ENTER_SCALE));
  const [slideY] = useState(() => new Animated.Value(ENTER_SLIDE_Y));
  const [contentH, setContentH] = useState(0);
  // enter animation DITAHAN sampe layout kemeasure + positioning primitive
  // ke-commit. kalo langsung jalan pas mount: frame awal masih off-screen
  // (tahap ukur posisi) + originY berubah pas H kemeasure = jitter.
  const [ready, setReady] = useState(false);
  // onLayout dari Slot (positioning primitive) tetep diterusin, kita
  // nebeng buat ngukur tinggi.
  const { onLayout: slotOnLayout, ...rest } = props;

  const handleLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setContentH((prev) => (prev === h ? prev : h));
    if (h > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setReady(true));
      });
    }
    slotOnLayout?.(e);
  };

  useEffect(() => {
    if (phase !== 'entering' || !ready) return;
    opacity.setValue(0);
    scale.setValue(ENTER_SCALE);
    slideY.setValue(ENTER_SLIDE_Y);
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [phase, ready, opacity, scale, slideY]);

  useEffect(() => {
    if (phase !== 'exiting') return;
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: EXIT_SCALE,
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: EXIT_SLIDE_Y,
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [phase, opacity, scale, slideY]);

  const dir = origin === 'left' ? -1 : origin === 'right' ? 1 : 0;
  const translateX = scale.interpolate({
    inputRange: [ENTER_SCALE, 1],
    outputRange: [(dir * ((1 - ENTER_SCALE) * MENU_WIDTH)) / 2, 0],
  });
  const originY = scale.interpolate({
    inputRange: [ENTER_SCALE, 1],
    outputRange: [-((1 - ENTER_SCALE) * contentH) / 2, 0],
  });

  return (
    <Animated.View
      {...rest}
      onLayout={handleLayout}
      style={[
        style,
        { opacity, transform: [{ translateX }, { translateY: Animated.add(slideY, originY) }, { scale }] },
      ]}>
      {children}
    </Animated.View>
  );
}

// Slot child buat Item asChild: nerima onPress/role/aria dari primitive,
// nge-render outer clip + Pressable ripple milik sendiri.
// NOTE: onPress dari Slot (Item internal → action) sengaja NGGAK dipasang
// manual di Pressable — Slot udah nge-compose: onDismiss kita jalan dulu,
// baru action. kalo dipasang manual, action kefire 2x.
function MenuItemButton({ children, onDismiss, onPress: _slotOnPress, ...props }: MenuItemButtonProps) {
  const { colors } = useColorScheme();

  return (
    <View style={styles.itemOuter}>
      <Pressable
        {...props}
        onPress={onDismiss}
        android_ripple={{
          color: withOpacity(colors.foreground, 0.14),
          borderless: false,
        }}
        style={({ pressed }) => [
          pressed && { backgroundColor: withOpacity(colors.foreground, 0.08) },
        ]}>
        <View style={styles.itemRow}>{children}</View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  // outer: radius + clip. ripple/pressed-bg yang digambar Pressable di
  // dalamnya kepotong ngikutin rounded ini. konsentris sama menu
  // (MENU_RADIUS = ITEM_RADIUS + MENU_PADDING).
  itemOuter: {
    borderRadius: ITEM_RADIUS,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MENU_ITEM_H,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemIcon: {
    width: 26,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
