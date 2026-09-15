import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useColorScheme } from '@/lib/useColorScheme';

/**
 * teks leading di sebelah back button — POLOS tanpa pill.
 * judul 1 baris (note list) atau judul + sub timestamp (editor).
 * root flex:1 biar kepotong elipsis pas sempit.
 */
export type ToolbarTitleProps = {
  title: string;
  /** opsional — baris 2 kecil muted (timestamp editor). */
  subtitle?: string;
  /** opsional — ikon leading mati (space icon dsb). */
  icon?: ReactNode;
  accessibilityLabel?: string;
};

export function ToolbarTitle({ title, subtitle, icon, accessibilityLabel }: ToolbarTitleProps) {
  const { colors } = useColorScheme();
  return (
    <View
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            color: colors.foreground,
            fontSize: 17,
            fontWeight: '600',
          }}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              fontWeight: '500',
            }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
