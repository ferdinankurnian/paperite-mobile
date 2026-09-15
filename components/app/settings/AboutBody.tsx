import { View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';

import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

export function AboutBody() {
  const { colors, isDarkColorScheme } = useColorScheme();
  return (
    <View
      style={{
        backgroundColor: isDarkColorScheme ? withOpacity(colors.card, 0.68) : colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: withOpacity(colors.border, 0.9),
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 2,
      }}>
      <PaperText
        variant="titleMedium"
        style={{ color: colors.primary, fontFamily: 'Courgette_400Regular', fontSize: 24 }}>
        Paperite
      </PaperText>
      <PaperText variant="bodySmall" style={{ color: colors.mutedForeground }}>
        mobile companion for Paperite desktop · v1.0.0
      </PaperText>
    </View>
  );
}
