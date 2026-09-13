import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { MaterialSymbol } from './MaterialSymbol';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ToolbarItem, TOOLBAR_ITEM_SIZE, type ToolbarIconName } from './Toolbar';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

export type ToolbarMenuItem = {
  type?: 'item';
  title: string;
  /** opsional — desktop ada row tanpa icon (spacer), parity ikut */
  icon?: ToolbarIconName;
  accessibilityLabel?: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

export type ToolbarMenuSeparator = {
  type: 'separator';
};

export type ToolbarMenuSubmenu = {
  type: 'submenu';
  title: string;
  icon?: ToolbarIconName;
  accessibilityLabel?: string;
  disabled?: boolean;
  children: ToolbarMenuItem[];
};

export type ToolbarMenuEntry = ToolbarMenuItem | ToolbarMenuSeparator | ToolbarMenuSubmenu;

/** backward-compat buat caller lama (flat actions tanpa separator). */
export type ToolbarMenuAction = {
  title: string;
  icon: ToolbarIconName;
  accessibilityLabel?: string;
  onPress?: () => void;
};

type ToolbarMenuProps = {
  entries?: ToolbarMenuEntry[];
  actions?: ToolbarMenuAction[];
  accessibilityLabel?: string;
  /** true kalo trigger duduk di dalem ToolbarGroup: tanpa border/shadow sendiri. */
  grouped?: boolean;
};

const MENU_WIDTH = 224;
// flyout selebar parent biar rata kiri-kanan (chevron sejajar).
const SUBMENU_WIDTH = MENU_WIDTH;
const MENU_PADDING = 6;
const ITEM_RADIUS = 16;
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

export function ToolbarMenu({
  entries,
  actions,
  accessibilityLabel = 'More options',
  grouped = false,
}: ToolbarMenuProps) {
  const { colors, isDarkColorScheme } = useColorScheme();
  const triggerRef = useRef<View>(null);
  const [origin, setOrigin] = useState<MenuOrigin>('right');
  const [phase, setPhase] = useState<MenuPhase>('closed');
  // submenu yang lagi kebuka (flyout kayak ChatGPT, bukan accordion inline).
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  // flyout nutupnya pake animasi dulu (mirip exit menu utama), baru unmount.
  const [subClosing, setSubClosing] = useState(false);
  const subCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // anchor vertikal flyout (koordinat lokal Modal) + tinggi kartu flyout.
  const [subAnchorY, setSubAnchorY] = useState(0);
  const [subCardH, setSubCardH] = useState(0);
  const subRowRefs = useRef<Record<string, View | null>>({});
  // rect trigger dalam koordinat window — buat positioning menu di Modal.
  const [triggerRect, setTriggerRect] = useState<{
    pageX: number;
    pageY: number;
    width: number;
    height: number;
  } | null>(null);
  // Modal cuma visible pas menu hidup (entering/exiting) — pas closed unmount
  // bersih, nggak nge-block touch.
  const mounted = phase !== 'closed';

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // trigger udah ke-layout (lagi keliatan), jadi bisa langsung diukur.
      // measureInWindow biar koordinatnya 1:1 sama konten Modal
      // (statusBarTranslucent).
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        setTriggerRect({ pageX: x, pageY: y, width, height });
        const screenW = Dimensions.get('window').width;
        const centerX = x + width / 2;
        setOrigin(
          centerX < screenW / 3 ? 'left' : centerX > (screenW * 2) / 3 ? 'right' : 'center'
        );
      });
      // tiap buka mulai rapet — submenu nggak nyangkut kebuka
      if (subCloseTimeout.current) {
        clearTimeout(subCloseTimeout.current);
        subCloseTimeout.current = null;
      }
      setOpenSubmenu(null);
      setSubClosing(false);
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

  // caller lama (flat actions) dilipat jadi entries biasa
  const resolved: ToolbarMenuEntry[] =
    entries ?? actions?.map((a) => ({ ...a, type: 'item' as const })) ?? [];

  const closeSubmenu = () => {
    if (!openSubmenu || subClosing) return;
    setSubClosing(true);
    if (subCloseTimeout.current) clearTimeout(subCloseTimeout.current);
    subCloseTimeout.current = setTimeout(() => {
      setOpenSubmenu(null);
      setSubClosing(false);
    }, EXIT_DURATION + 40);
  };
  // timeout nyangkut = submenu ketutup sendiri — bersihin pas unmount.
  useEffect(() => {
    return () => {
      if (subCloseTimeout.current) clearTimeout(subCloseTimeout.current);
    };
  }, []);
  const openSubEntry = resolved.find(
    (e): e is ToolbarMenuSubmenu =>
      e.type === 'submenu' && (e.accessibilityLabel ?? e.title) === openSubmenu
  );

  const renderItemRow = (item: ToolbarMenuItem, key: string) => {
    const tint = item.destructive ? colors.destructive : colors.foreground;
    const row = (
      <MenuItemButton onDismiss={item.disabled ? undefined : startDismiss} disabled={item.disabled}>
        <View style={styles.itemIcon}>
          {item.icon ? (
            <MaterialSymbol name={item.icon} size={26} color={tint} />
          ) : (
            <View style={{ width: 26 }} />
          )}
        </View>
        <Text numberOfLines={1} style={[styles.itemLabel, { color: tint }]}>
          {item.title}
        </Text>
      </MenuItemButton>
    );
    // disabled = baris statis, nggak nempel ke primitive (nggak bisa di-tap,
    // nggak nutup menu). enabled = Item asChild kayak biasa.
    if (item.disabled) {
      return <View key={key}>{row}</View>;
    }
    return (
      <DropdownMenuPrimitive.Item
        key={key}
        asChild
        textValue={item.title}
        closeOnPress={false}
        onPress={item.onPress}>
        {row}
      </DropdownMenuPrimitive.Item>
    );
  };

  // exit kelar → sync close ke primitive (clear posisi + internal open),
  // baru unmount. timeout jadi safety net biar phase nggak nyangkut.
  useEffect(() => {
    if (phase !== 'exiting') return;
    const t = setTimeout(() => {
      (triggerRef.current as unknown as { close?: () => void } | null)?.close?.();
      setPhase('closed');
    }, EXIT_DURATION + 60);
    return () => clearTimeout(t);
  }, [phase]);

  // posisi menu di Modal, dihitung dari rect trigger (align end + nempel
  // trigger kayak sideOffset negatif sebelumnya). clamp biar nggak offscreen.
  // NOTE: measureInWindow vs origin konten Modal selisih setinggi status bar
  // (menu ke-render ketinggian), jadi dikoreksi pake StatusBar.currentHeight.
  // di iOS nilainya undefined → +0 (di sana koordinatnya udah 1:1).
  const screenW = Dimensions.get('window').width;
  const statusBarH = StatusBar.currentHeight ?? 0;
  const menuLeft = triggerRect
    ? Math.max(
        8,
        Math.min(triggerRect.pageX + triggerRect.width - MENU_WIDTH, screenW - MENU_WIDTH - 8)
      )
    : screenW - MENU_WIDTH - 8;
  const menuTop = triggerRect
    ? Math.max(8, triggerRect.pageY + triggerRect.height - TOOLBAR_ITEM_SIZE + statusBarH)
    : 100;
  const menuStyle: ViewStyle = {
    position: 'absolute',
    flexDirection: 'column',
    borderWidth: 1,
    borderRadius: MENU_RADIUS,
    padding: MENU_PADDING,
    gap: 2,
    overflow: 'hidden',
    // tanpa shadow/elevation — flat ngikutin border doang
    width: MENU_WIDTH,
    backgroundColor: colors.card,
    borderColor: withOpacity(colors.border, 0.9),
  };
  // kartu flyout submenu: gaya sama kayak menu, cuma lebih ramping + posisi
  // diatur wrapper di bawah (top/left), bukan di sini.
  const subMenuStyle: ViewStyle = {
    ...menuStyle,
    position: 'relative',
    width: SUBMENU_WIDTH,
  };
  // flyout numpang pas di atas parent (ala ChatGPT): selebar parent dan
  // rata kiri-kanan, jadi chevron-nya sejajar sama baris trigger.
  // parent masih ngintip di atas-bawah (flyout lebih pendek) + di-dim.
  const screenH = Dimensions.get('window').height;
  const subLeft = Math.max(8, menuLeft + MENU_WIDTH - SUBMENU_WIDTH);
  // kartu duduk dikit di atas baris trigger-nya (ala ChatGPT), clamp onscreen.
  const subTop = Math.max(8, Math.min(subAnchorY - 10, screenH - subCardH - 8));

  return (
    <DropdownMenuPrimitive.Root onOpenChange={handleOpenChange}>
      <DropdownMenuPrimitive.Trigger asChild>
        <ToolbarItem
          ref={triggerRef}
          hitSlop={grouped ? 4 : 12}
          icon="more_vert"
          grouped={grouped}
          accessibilityLabel={accessibilityLabel}
        />
      </DropdownMenuPrimitive.Trigger>

      {/* Modal = window terpisah di atas segalanya: touch fisik nggak bakal
          nyampe ke drawer gesture di bawah (nggak kayak Portal yang se-window).
          jadi swipe drawer mati total selama menu kebuka. Root/Trigger/Item
          primitive tetep dipake buat behavior + a11y, cuma positioning-nya
          kita yang pegang via triggerRect. */}
      <Modal
        visible={mounted}
        transparent
        animationType="none"
        statusBarTranslucent
        // back = tutup submenu dulu kalo lagi kebuka, baru dismiss semua.
        onRequestClose={() => (openSubmenu ? closeSubmenu() : startDismiss())}>
        <Pressable accessible={false} onPress={startDismiss} style={styles.modalOverlay}>
          {/* triggerRect dipasang pas open; overlay transparan jadi nunggu
              1 frame nggak keliatan. */}
          {triggerRect ? (
            <AnimatedMenuContent
              origin={origin}
              phase={phase}
              scaledDown={!!openSubEntry}
              style={[menuStyle, { top: menuTop, left: menuLeft }]}>
              {resolved.map((entry, index) => {
                // asChild: Slot-nya primitive nempelin behavior nutup-menu +
                // accessibility ke MenuItemButton. ripple di android nggak mau
                // ke-clip sama radius di Pressable yang sama, jadi yang megang
                // radius + overflow:hidden itu outer View statis (trik
                // outer = inner + padding), Pressable duduk di dalamnya.
                if (entry.type === 'separator') {
                  return (
                    <View
                      key={`sep-${index}`}
                      style={[styles.separator, { backgroundColor: colors.border }]}
                    />
                  );
                }
                if (entry.type === 'submenu') {
                  const subKey = entry.accessibilityLabel ?? entry.title;
                  const open = openSubmenu === subKey;
                  const tint = colors.foreground;
                  return (
                    <View key={subKey}>
                      <View
                        ref={(el) => {
                          subRowRefs.current[subKey] = el;
                        }}
                        style={styles.itemOuter}>
                        <Pressable
                          onPress={() => {
                            if (entry.disabled) return;
                            if (open) {
                              closeSubmenu();
                              return;
                            }
                            // ukur baris dulu biar flyout nempel di baris ini.
                            // PENTING: baris ini ada DI DALAM Modal (window
                            // terpisah) → measureInWindow-nya udah se-basis
                            // sama konten modal. JANGAN tambah statusBarH
                            // (beda sama trigger yang diukur di main window).
                            if (subCloseTimeout.current) {
                              clearTimeout(subCloseTimeout.current);
                              subCloseTimeout.current = null;
                            }
                            setSubClosing(false);
                            subRowRefs.current[subKey]?.measureInWindow((_x, y) => {
                              setSubAnchorY(y);
                            });
                            setOpenSubmenu(subKey);
                          }}
                          disabled={entry.disabled}
                          android_ripple={{
                            color: withOpacity(colors.foreground, 0.14),
                            borderless: false,
                          }}
                          style={({ pressed }) => [
                            pressed && { backgroundColor: withOpacity(colors.foreground, 0.08) },
                            entry.disabled && { opacity: 0.4 },
                          ]}>
                          <View style={styles.itemRow}>
                            <View style={styles.itemIcon}>
                              {entry.icon ? (
                                <MaterialSymbol name={entry.icon} size={26} color={tint} />
                              ) : (
                                <View style={{ width: 26 }} />
                              )}
                            </View>
                            <Text numberOfLines={1} style={[styles.itemLabel, { color: tint }]}>
                              {entry.title}
                            </Text>
                            <MaterialSymbol
                              name={open ? 'expand_more' : 'chevron_right'}
                              size={26}
                              color={colors.mutedForeground}
                            />
                          </View>
                        </Pressable>
                      </View>
                    </View>
                  );
                }
                return renderItemRow(entry, entry.accessibilityLabel ?? entry.title);
              })}
              {/* dim khusus kartu parent pas flyout kebuka (backdrop fullscreen
                  udah dicabut) — nempel di dalem container jadi ikut scale.
                  opacity ngikutin tema: light mode lebih tipis biar nggak
                  jadi abu kotor. */}
              {openSubEntry ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.menuDim,
                    { backgroundColor: withOpacity('#000000', isDarkColorScheme ? 0.45 : 0.18) },
                  ]}
                />
              ) : null}
            </AnimatedMenuContent>
          ) : null}
          {/* flyout submenu ala ChatGPT: kartu terpisah numpang di atas parent
              yang di-dim. tap di luar kartu = balik ke parent, tap item =
              jalanin action + tutup semua. */}
          {openSubEntry ? (
            <>
              <Pressable
                accessible={false}
                onPress={closeSubmenu}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={{ position: 'absolute', top: subTop, left: subLeft }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  setSubCardH((prev) => (prev === h ? prev : h));
                }}>
                <AnimatedMenuContent
                  origin="center"
                  phase={phase}
                  closing={subClosing}
                  style={subMenuStyle}>
                  <View style={styles.itemOuter}>
                    <Pressable
                      onPress={closeSubmenu}
                      android_ripple={{
                        color: withOpacity(colors.foreground, 0.14),
                        borderless: false,
                      }}
                      style={({ pressed }) => [
                        pressed && { backgroundColor: withOpacity(colors.foreground, 0.08) },
                      ]}>
                      <View style={styles.itemRow}>
                        <View style={styles.itemIcon}>
                          {openSubEntry.icon ? (
                            <MaterialSymbol
                              name={openSubEntry.icon}
                              size={26}
                              color={colors.foreground}
                            />
                          ) : (
                            <View style={{ width: 26 }} />
                          )}
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[styles.itemLabel, { color: colors.foreground }]}>
                          {openSubEntry.title}
                        </Text>
                        <MaterialSymbol
                          name="expand_more"
                          size={26}
                          color={colors.mutedForeground}
                        />
                      </View>
                    </Pressable>
                  </View>
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  {openSubEntry.children.map((child) =>
                    renderItemRow(
                      child,
                      `${openSubEntry.accessibilityLabel ?? openSubEntry.title}/${child.title}`
                    )
                  )}
                </AnimatedMenuContent>
              </View>
            </>
          ) : null}
        </Pressable>
      </Modal>
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
  style: StyleProp<ViewStyle>;
  /** exit animation tanpa nunggu phase (buat flyout submenu). */
  closing?: boolean;
  /** parent nyusut dikit pas flyout submenu kebuka (ala ChatGPT). */
  scaledDown?: boolean;
};

// Konten menu di dalam Modal — positioning eksplisit via style (top/left dari
// triggerRect), nggak lewat primitive lagi. mount = entering, unmount = closed,
// jadi enter jalan tiap buka & exit ketahan sampe animasi kelar.
// RN nggak ada transform-origin, jadi origin di-fake pake kompensasi translate:
// - horizontal (kiri/kanan): scale s ngecilin dari tengah → tepi geser
//   (1-s)*W/2, tinggal balikin.
// - vertikal: menu selalu kebuka ke bawah trigger → origin top. tepi atas
//   geser turun (1-s)*H/2 pas ngecil, balikin ke atas. H diukur beneran
//   via onLayout karena tinggi menu dinamis ngikutin jumlah item.
function AnimatedMenuContent({
  origin,
  phase,
  closing = false,
  scaledDown = false,
  children,
  style,
}: AnimatedMenuContentProps) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(ENTER_SCALE));
  const [slideY] = useState(() => new Animated.Value(ENTER_SLIDE_Y));
  // scale latar: parent nyusut 1 → 0.95 pas flyout kebuka, balik lagi pas tutup.
  const [bgScale] = useState(() => new Animated.Value(1));
  const [contentH, setContentH] = useState(0);
  // enter animation DITAHAN sampe layout kemeasure. kalo langsung jalan pas
  // mount: originY berubah pas H kemeasure = jitter.
  const [ready, setReady] = useState(false);

  const handleLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setContentH((prev) => (prev === h ? prev : h));
    if (h > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setReady(true));
      });
    }
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
    if (phase !== 'exiting' && !closing) return;
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
  }, [phase, closing, opacity, scale, slideY]);

  // parent nyusut/mekar pas flyout buka/tutup. value terpisah dari scale
  // enter/exit biar nggak tarik-tarikan.
  useEffect(() => {
    const anim = Animated.timing(bgScale, {
      toValue: scaledDown ? 0.95 : 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [scaledDown, bgScale]);

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
      onLayout={handleLayout}
      style={[
        style,
        {
          opacity,
          transform: [
            { translateX },
            { translateY: Animated.add(slideY, originY) },
            { scale },
            { scale: bgScale },
          ],
        },
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
function MenuItemButton({
  children,
  onDismiss,
  disabled,
  onPress: _slotOnPress,
  ...props
}: MenuItemButtonProps & { disabled?: boolean }) {
  const { colors } = useColorScheme();

  return (
    <View style={styles.itemOuter}>
      <Pressable
        {...props}
        onPress={onDismiss}
        disabled={disabled}
        android_ripple={{
          color: withOpacity(colors.foreground, 0.14),
          borderless: false,
        }}
        style={({ pressed }) => [
          pressed && !disabled && { backgroundColor: withOpacity(colors.foreground, 0.08) },
          disabled && { opacity: 0.4 },
        ]}>
        <View style={styles.itemRow}>{children}</View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // overlay di dalam Modal: full-screen, transparan, nangkap tap-outside
  // buat dismiss. touch di sini nggak akan pernah nyampe ke window bawah
  // (drawer gesture mati total selama menu kebuka).
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // dim di DALEM kartu parent pas flyout kebuka: cuma parent yang redup,
  // backdrop di luar menu tetep terang. parent udah overflow:hidden jadi
  // kepotong ngikutin rounded-nya sendiri. warna dasar di-override inline
  // ngikutin tema (lihat pemakaian styles.menuDim).
  menuDim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
    marginHorizontal: 12,
  },
});
