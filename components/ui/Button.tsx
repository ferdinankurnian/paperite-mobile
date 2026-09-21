import { Children, Fragment, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text as PaperText } from 'react-native-paper';

import { MaterialSymbol } from './MaterialSymbol';
import { useColorScheme } from '@/lib/useColorScheme';
import { COLORS } from '@/theme/colors';
import { withOpacity } from '@/theme/with-opacity';
import { useFixedPressScale } from '@/lib/use-fixed-press-scale';

/**
 * button standar — pill ala toolbar (h48, full radius).
 * fit content + center sendiri (alignSelf center), jangan di-stretch.
 * size="icon" → bulet 48x48 icon-only ala shadcn, varian warna tetap nempel.
 * skala emphasis: default → primary (fill oren) → tinted (fill warna bebas)
 * → destructive → ghost.
 */
export type ButtonVariant = 'default' | 'primary' | 'tinted' | 'destructive' | 'ghost';

export type ButtonSize = 'default' | 'icon';

type ButtonBaseProps = {
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** warna custom KHUSUS varian tinted (bg + border). primary/destructive tint-nya dikunci. */
  tint?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export type ButtonProps = ButtonBaseProps &
  (
    | {
        size?: 'default';
        title: string;
        /** nama MaterialSymbol, mis. "image". dirender 22px di kiri label. */
        icon?: string;
      }
    | {
        size: 'icon';
        title?: string;
        /** nama MaterialSymbol — WAJIB buat size icon, dirender 26px. */
        icon: string;
      }
  );

export const BUTTON_HEIGHT = 48;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = 'default',
  disabled = false,
  icon,
  size = 'default',
  tint,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const { colors, isDarkColorScheme } = useColorScheme();
  const { holding, onLayout, pressIn, pressOut, transform } = useFixedPressScale(disabled, {
    uniformFromWidth: true,
  });

  const bordered = variant !== 'ghost';
  // primary = fill theme primary (tint dikunci, ga bisa custom).
  // tinted = fill warna bebas (kasih tint, fallback primary).
  // destructive = tinted yang tint-nya dikunci ke colors.destructive.
  const isFilled = variant === 'primary' || variant === 'tinted' || variant === 'destructive';
  const tintColor =
    variant === 'destructive'
      ? colors.destructive
      : variant === 'tinted'
        ? (tint ?? colors.primary)
        : colors.primary;

  // filled: dark bg 0.85 + ring solid (ring brighter dari fill).
  // light (eksperimen flip): bg primary 0.8 / tinted 0.9 + ring putih
  // translusen, jadi ring lebih terang dari fill — hubungan yang sama
  // kayak dark. solid murni kepanasen/gosong di light, makanya ga solid.
  // destructive selalu solid biar merahnya ga kepink.
  // ios ga ada ripple — feedback lewat bg yang memadat ke solid pas holding,
  // destructive (udah solid) lewat fade.

  const iosDeepen =
    Platform.OS === 'ios' && holding && (variant === 'primary' || variant === 'tinted');

  const bg = isFilled
    ? variant === 'destructive'
      ? tintColor
      : !isDarkColorScheme
        ? withOpacity(tintColor, variant === 'primary' ? 0.8 : 0.9)
        : iosDeepen
          ? tintColor
          : withOpacity(tintColor, 0.85)
    : variant === 'ghost'
      ? 'transparent'
      : colors.card;

  const rippleColor = isFilled
    ? withOpacity(COLORS.white, 0.3)
    : withOpacity(colors.foreground, 0.2);

  // filled (primary/tinted/destructive): teks white.
  // outline (default) + ghost: foreground.
  const fg = disabled
    ? colors.mutedForeground
    : variant === 'ghost' || variant === 'default'
      ? colors.foreground
      : COLORS.white;

  // colored light: ring putih 0.35 di atas fill (brighter dari fill).
  // destructive light ikut flip juga (dulu ring item).
  // destructive dark → ring putih 0.15. default/ghost → ring abu token.
  const borderColor =
    variant === 'destructive'
      ? isDarkColorScheme
        ? withOpacity(COLORS.white, 0.15)
        : withOpacity(COLORS.white, 0.35)
      : isFilled
        ? isDarkColorScheme
          ? tintColor
          : withOpacity(COLORS.white, 0.35)
        : withOpacity(colors.border, 0.9);

  const isIconOnly = size === 'icon';

  return (
    <AnimatedPressable
      onPress={() => {
        pressOut();
        onPress?.();
      }}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onLayout={onLayout}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title ?? icon}
      // border digambar sebagai overlay child (bukan di Pressable-nya),
      // jadi bounds ripple = full outer rect tanpa inset 1px.
      // foreground ripple kegambar DI ATAS overlay border itu.
      android_ripple={{ color: rippleColor, borderless: false, foreground: true }}
      style={[
        styles.slot,
        {
          height: BUTTON_HEIGHT,
          width: isIconOnly ? BUTTON_HEIGHT : undefined,
          borderRadius: BUTTON_HEIGHT / 2,
          backgroundColor: bg,
          opacity: disabled ? 0.4 : pressedOpacity(holding, iosDeepen),
          transform,
        },
        style,
      ]}>
      <View style={[styles.content, isIconOnly && styles.iconOnlyContent]}>
        {isIconOnly ? (
          icon ? (
            <MaterialSymbol name={icon} size={26} color={fg} />
          ) : null
        ) : (
          <>
            {icon ? <MaterialSymbol name={icon} size={22} color={fg} /> : null}
            {title ? (
              <PaperText variant="titleMedium" style={{ color: fg, fontWeight: '600' }}>
                {title}
              </PaperText>
            ) : null}
          </>
        )}
      </View>
      {bordered ? (
        <View
          pointerEvents="none"
          style={[
            styles.borderOverlay,
            {
              borderRadius: BUTTON_HEIGHT / 2,
              borderWidth: 1,
              borderColor,
            },
          ]}
        />
      ) : null}
    </AnimatedPressable>
  );
}

/** frame pill isi Button yang tetap misah — ala ToolbarGroup.
 * anak dirender apa adanya (border + radius sendiri utuh),
 * antar anak dipisah divider. */
export function ButtonGroup({
  children,
  style,
  accessibilityLabel = 'Actions',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useColorScheme();
  const items = Children.toArray(children);
  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.group,
        {
          backgroundColor: colors.card,
          borderColor: withOpacity(colors.border, 0.9),
        },
        style,
      ]}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <View
              style={[styles.groupDivider, { backgroundColor: withOpacity(colors.border, 0.9) }]}
            />
          ) : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

function pressedOpacity(holding: boolean, bgDeepens: boolean) {
  if (bgDeepens) return 1;
  // native ripple handles android feedback; ios has no ripple so fade instead
  if (Platform.OS === 'ios' && holding) return 0.7;
  return 1;
}

const styles = StyleSheet.create({
  slot: {
    alignSelf: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  borderOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  iconOnlyContent: {
    paddingHorizontal: 0,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    padding: 4,
    gap: 4,
    borderRadius: BUTTON_HEIGHT / 2 + 4,
    borderWidth: 1,
  },
  groupDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    alignSelf: 'center',
    flexShrink: 0,
  },
});
