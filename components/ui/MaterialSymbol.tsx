import { Text } from 'react-native';

import { useColorScheme } from '@/lib/useColorScheme';

export const MATERIAL_SYMBOLS_FONT = 'MaterialSymbols_400Regular';

/**
 * single source buat semua ikon UI (material symbols M3).
 * name = ligature symbols pake underscore, mis. "more_vert", "search", "format_bold".
 */
export function MaterialSymbol({
  name,
  size = 26,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const { colors } = useColorScheme();
  return (
    <Text
      selectable={false}
      style={{
        fontFamily: MATERIAL_SYMBOLS_FONT,
        fontSize: size,
        lineHeight: size,
        includeFontPadding: false,
        textAlign: 'center',
        textAlignVertical: 'center',
        color: color ?? colors.foreground,
      }}>
      {name}
    </Text>
  );
}
