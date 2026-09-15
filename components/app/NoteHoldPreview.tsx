// hold-preview ala instagram: note di-hold → row-nya sendiri yang
// "keangkat" (preview nempel persis di atas posisi row asli, yang di
// bawah ke-dim) + menu compact di KANAN bawahnya.
//
// animasi preview: fade (+ naik dikit pas masuk, diem pas keluar).
// animasi menu: ngembang dari kanan-atas kayak ToolbarMenu dropdown
// (origin scale, bukan fade polos). action baru jalan SETELAH exit kelar.

import * as React from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialSymbol } from '@/components/ui/MaterialSymbol';
import { type Note } from '@/lib/paperite-data';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

/** rect row yang di-hold (koordinat measureInWindow). */
export type HoldAnchor = {
  pageY: number;
  pageX?: number;
  width?: number;
};

type Props = {
  note: Note | null;
  anchor: HoldAnchor | null;
  breadcrumb?: string;
  showPreview?: boolean;
  onDismiss: () => void;
  onOpen: (note: Note) => void;
  onSelect: (note: Note) => void;
  onMove: (note: Note) => void;
  onPin: (note: Note) => void;
  onDelete: (note: Note) => void;
};

const ENTER_DURATION = 150;
const EXIT_DURATION = 130;
const LIFT_PX = 8;
// origin anim menu — angka ngikutin ToolbarMenu
const MENU_ENTER_SCALE = 0.8;
const MENU_EXIT_SCALE = 0.9;
const MENU_SLIDE_Y = -6;
const MENU_EXIT_SLIDE_Y = -3;
const MENU_DELAY = 60;

function MenuRow({
  icon,
  label,
  destructive,
  onPress,
}: {
  icon: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const { colors } = useColorScheme();
  const tint = destructive ? colors.destructive : colors.foreground;
  return (
    <View style={styles.rowOuter}>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: withOpacity(colors.foreground, 0.14), borderless: false }}
        style={({ pressed }) => [
          pressed && { backgroundColor: withOpacity(colors.foreground, 0.08) },
        ]}>
        <View style={styles.rowInner}>
          <MaterialSymbol name={icon as never} size={24} color={tint} />
          <PaperText variant="bodyLarge" style={{ color: tint, fontWeight: '500', flex: 1 }}>
            {label}
          </PaperText>
        </View>
      </Pressable>
    </View>
  );
}

export function NoteHoldPreview({
  note,
  anchor,
  breadcrumb,
  showPreview = true,
  onDismiss,
  onOpen,
  onSelect,
  onMove,
  onPin,
  onDelete,
}: Props) {
  const { colors, isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const [opacity] = React.useState(() => new Animated.Value(0));
  const [lift] = React.useState(() => new Animated.Value(LIFT_PX));
  // menu punya values sendiri biar bisa origin animation terpisah
  const [menuOpacity] = React.useState(() => new Animated.Value(0));
  const [menuScale] = React.useState(() => new Animated.Value(MENU_ENTER_SCALE));
  const [menuSlide] = React.useState(() => new Animated.Value(MENU_SLIDE_Y));
  const [menuH, setMenuH] = React.useState(0);
  // note yang lagi dalam exit animation. render = prop note ?? ini —
  // jadi ga perlu sync state di effect sama sekali.
  const [closingNote, setClosingNote] = React.useState<Note | null>(null);
  const leavingRef = React.useRef(false);
  const animRef = React.useRef<Animated.CompositeAnimation | null>(null);

  const stopAnim = () => {
    animRef.current?.stop();
    animRef.current = null;
  };

  // enter: cuma nyentuh Animated values + ref, tanpa setState.
  // preview fade duluan, menu nyusul dikit ngembang dari kanan-atas.
  React.useEffect(() => {
    if (!note) return;
    leavingRef.current = false;
    stopAnim();
    opacity.setValue(0);
    lift.setValue(LIFT_PX);
    menuOpacity.setValue(0);
    menuScale.setValue(MENU_ENTER_SCALE);
    menuSlide.setValue(MENU_SLIDE_Y);
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ENTER_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: ENTER_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(MENU_DELAY),
        Animated.parallel([
          Animated.timing(menuOpacity, {
            toValue: 1,
            duration: 150,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(menuScale, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(menuSlide, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);
    animRef.current = anim;
    anim.start(() => {
      animRef.current = null;
    });
    return stopAnim;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  React.useEffect(() => stopAnim, []);

  // exit: preview fade di tempat, menu nyusut balik ke kanan-atas.
  const closeThen = (target: Note, fn: () => void) => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setClosingNote(target);
    stopAnim();
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(menuOpacity, {
        toValue: 0,
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(menuScale, {
        toValue: MENU_EXIT_SCALE,
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(menuSlide, {
        toValue: MENU_EXIT_SLIDE_Y,
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animRef.current = anim;
    anim.start(() => {
      animRef.current = null;
      leavingRef.current = false;
      setClosingNote(null);
      fn();
    });
  };

  const current = note ?? closingNote;
  const visible = current !== null;
  if (!current) return null;
  const screenH = Dimensions.get('window').height;
  const screenW = Dimensions.get('window').width;
  // measureInWindow = relatif ke app window (di bawah status bar),
  // konten Modal translucent = dari ujung layar. koreksi biar 1:1
  // (pattern yang sama kayak ToolbarMenu).
  const statusBarH = StatusBar.currentHeight ?? 0;
  const rawTop = (anchor?.pageY ?? screenH / 2 - 160) + statusBarH;
  // clamp cuma buat jaga-jaga biar ga kepotong layar — selama muat,
  // preview duduk EXACT di atas row aslinya.
  const top = Math.max(insets.top + 8, Math.min(rawTop, screenH - 400));

  const left = anchor?.pageX ?? 16;
  const width = anchor?.width ?? screenW - 32;
  // menu compact rata KANAN, selebar ToolbarMenu
  const menuWidth = Math.min(232, width);
  // RN ga ada transform-origin — origin kanan-atas di-fake pake
  // kompensasi translate (pattern yang sama kayak ToolbarMenu):
  // scale ngecil dari tengah → tepi kanan geser (1-s)*W/2 (balikin),
  // tepi atas turun (1-s)*H/2 (naikin).
  const menuTX = menuScale.interpolate({
    inputRange: [MENU_ENTER_SCALE, 1],
    outputRange: [((1 - MENU_ENTER_SCALE) * menuWidth) / 2, 0],
  });
  const menuTY = menuScale.interpolate({
    inputRange: [MENU_ENTER_SCALE, 1],
    outputRange: [(-(1 - MENU_ENTER_SCALE) * menuH) / 2, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => closeThen(current, onDismiss)}>
      <Pressable
        accessible={false}
        onPress={() => closeThen(current, onDismiss)}
        style={[
          styles.backdrop,
          { backgroundColor: withOpacity('#000000', isDarkColorScheme ? 0.6 : 0.45) },
        ]}
      />
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { paddingTop: top, paddingLeft: left }]}>
        <Animated.View
          style={{
            opacity,
            transform: [{ translateY: lift }],
            width,
          }}>
          {/* kartu preview — layout 1:1 sama NoteRow (px-4 py-3, judul 18,
              preview 2 baris) biar teksnya sejajar sama row di bawahnya */}
          <View
            style={[
              styles.preview,
              {
                backgroundColor: colors.card,
                borderColor: withOpacity(colors.foreground, 0.12),
                shadowColor: '#000',
              },
            ]}>
            <View style={styles.previewInner}>
              {breadcrumb ? (
                <PaperText
                  variant="labelSmall"
                  style={{ color: colors.mutedForeground, marginBottom: 1 }}
                  numberOfLines={1}>
                  {breadcrumb}
                </PaperText>
              ) : null}
              <PaperText
                variant="titleMedium"
                style={{
                  color:
                    !current.title?.trim() || current.title === 'Untitled'
                      ? colors.mutedForeground
                      : colors.foreground,
                  fontSize: 18,
                  fontWeight: '600',
                  fontStyle: 'normal',
                }}
                numberOfLines={1}>
                {!current.title?.trim() || current.title === 'Untitled'
                  ? 'Untitled'
                  : current.title}
              </PaperText>
              {showPreview && current.preview?.trim() ? (
                <PaperText
                  variant="bodyMedium"
                  style={{ color: colors.mutedForeground }}
                  numberOfLines={2}>
                  {current.preview}
                </PaperText>
              ) : null}
            </View>
          </View>

          {/* menu nempel di bawah preview — compact rata kanan,
              ngembang dari kanan-atas */}
          <Animated.View
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              setMenuH((prev) => (prev === h ? prev : h));
            }}
            style={{
              opacity: menuOpacity,
              transform: [
                { translateX: menuTX },
                { translateY: Animated.add(menuSlide, menuTY) },
                { scale: menuScale },
              ],
              width: menuWidth,
              alignSelf: 'flex-end',
            }}>
            <View
              style={[
                styles.menu,
                {
                  backgroundColor: colors.card,
                  borderColor: withOpacity(colors.foreground, 0.12),
                  shadowColor: '#000',
                },
              ]}>
              <MenuRow
                icon="open_in_new"
                label="Open"
                onPress={() => closeThen(current, () => onOpen(current))}
              />
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <MenuRow
                icon="check_box"
                label="Select"
                onPress={() => closeThen(current, () => onSelect(current))}
              />
              <MenuRow
                icon="drive_file_move"
                label="Move to..."
                onPress={() => closeThen(current, () => onMove(current))}
              />
              {/* 1:1 desktop sidebar: Pin/Unpin note */}
              <MenuRow
                icon="push_pin"
                label={current.pinned ? 'Unpin' : 'Pin to top'}
                onPress={() => closeThen(current, () => onPin(current))}
              />
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <MenuRow
                icon="delete"
                label="Delete"
                destructive
                onPress={() => closeThen(current, () => onDelete(current))}
              />
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  preview: {
    borderRadius: 16,
    borderWidth: 1,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  // px-4 py-3 — sama kayak Pressable di NoteRow
  previewInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menu: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    padding: 6,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  rowOuter: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
    marginHorizontal: 12,
  },
});
