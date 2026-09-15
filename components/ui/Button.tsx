import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text as PaperText } from 'react-native-paper';

import { MaterialSymbol } from './MaterialSymbol';
import { useColorScheme } from '@/lib/useColorScheme';
import { COLORS } from '@/theme/colors';
import { withOpacity } from '@/theme/with-opacity';

/**
 * button standar — pill ala toolbar (h48, full radius).
 * fit content + center sendiri (alignSelf center), jangan di-stretch.
 * icon button bulet TETAP milik ToolbarItem, jangan dicampur.
 * skala emphasis: default → primary → tinted → destructive → ghost.
 */
export type ButtonVariant = 'default' | 'primary' | 'tinted' | 'destructive' | 'ghost';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** nama MaterialSymbol, mis. "image". dirender 22px di kiri label. */
  icon?: string;
  /** warna custom KHUSUS varian tinted (bg + border + teks + ripple). default primary. */
  tint?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export const BUTTON_HEIGHT = 48;

export function Button({
  title,
  onPress,
  variant = 'default',
  disabled = false,
  icon,
  tint,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const { colors, isDarkColorScheme } = useColorScheme();
  const [holding, setHolding] = useState(false);

  const bordered = variant !== 'ghost';
  // destructive = tinted yang tint-nya dikunci ke colors.destructive.
  const isFilled = variant === 'tinted' || variant === 'destructive';
  const tintColor = variant === 'destructive' ? colors.destructive : (tint ?? colors.primary);

  // filled: bg 0.85 + teks white, destructive selalu solid biar merahnya ga kepink.
  // border solid sewarna (silhouette ring).
  // ios ga ada ripple — tinted feedback lewat bg yang memadat ke solid pas holding,
  // destructive (udah solid) lewat fade.

  const iosDeepen = Platform.OS === 'ios' && holding && variant === 'tinted';

  const bg = isFilled
    ? variant === 'destructive'
      ? tintColor
      : iosDeepen
        ? tintColor
        : withOpacity(tintColor, 0.85)
    : variant === 'ghost'
      ? 'transparent'
      : colors.card;

  const rippleColor = isFilled
    ? withOpacity(COLORS.white, 0.3)
    : variant === 'primary'
      ? withOpacity(colors.primary, 0.3)
      : withOpacity(colors.foreground, 0.2);

  const fg =
    disabled || variant === 'ghost'
      ? disabled
        ? colors.mutedForeground
        : colors.foreground
      : variant === 'default'
        ? colors.foreground
        : isFilled
          ? COLORS.white
          : colors.primary;

  // tinted: ring solid sewarna tint — di light lebih kuat/gelap dari
  // fill (0.85) biar ada definisinya, no halo putih.
  // destructive: fill-nya solid, jadi ring solid sewarna pasti nyaru.
  // light → ring item translusen (lebih gelap dari fill),
  // dark → ring putih translusen (lebih terang dari fill, ngikut
  // filosofi tinted dark yang bordernya brighter dari fill-nya).
  const borderColor =
    variant === 'destructive'
      ? isDarkColorScheme
        ? withOpacity(COLORS.white, 0.15)
        : withOpacity(COLORS.black, 0.25)
      : isFilled
        ? tintColor
        : withOpacity(colors.border, 0.9);

  return (
    <Pressable
      onPress={() => {
        setHolding(false);
        onPress?.();
      }}
      onPressIn={() => setHolding(true)}
      onPressOut={() => setHolding(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      // border digambar sebagai overlay child (bukan di Pressable-nya),
      // jadi bounds ripple = full outer rect tanpa inset 1px.
      // foreground ripple kegambar DI ATAS overlay border itu.
      android_ripple={{ color: rippleColor, borderless: false, foreground: true }}
      style={[
        styles.slot,
        {
          height: BUTTON_HEIGHT,
          borderRadius: BUTTON_HEIGHT / 2,
          backgroundColor: bg,
          opacity: disabled ? 0.4 : pressedOpacity(holding, iosDeepen),
        },
        style,
      ]}>
      <View style={styles.content}>
        {icon ? <MaterialSymbol name={icon} size={22} color={fg} /> : null}
        <PaperText variant="titleMedium" style={{ color: fg, fontWeight: '600' }}>
          {title}
        </PaperText>
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
    </Pressable>
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
});
