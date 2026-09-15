import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

/**
 * card standar — r16 + overflow hidden.
 * default = bordered ala settings/appearance/about (bg card + border 1).
 * ghost = borderless ala note list (transparent, ga ada border).
 */
export type CardVariant = 'default' | 'ghost';

export const CARD_RADIUS = 16;

export function Card({
  variant = 'default',
  children,
  style,
}: {
  variant?: CardVariant;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, isDarkColorScheme } = useColorScheme();

  const bg =
    variant === 'ghost'
      ? 'transparent'
      : isDarkColorScheme
        ? withOpacity(colors.card, 0.68)
        : colors.card;

  return (
    <View
      style={[
        styles.slot,
        {
          backgroundColor: bg,
          borderWidth: variant === 'default' ? 1 : 0,
          borderColor: withOpacity(colors.border, 0.9),
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
});
