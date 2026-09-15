import { Pressable, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';

import { MaterialSymbol } from '@/components/ui/MaterialSymbol';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

const THEMES = [
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
  { value: 'system', label: 'System', icon: 'settings_brightness' },
] as const;

export function AppearanceBody() {
  const { colors, colorScheme, setColorScheme, isDarkColorScheme } = useColorScheme();
  return (
    <View
      style={{
        backgroundColor: isDarkColorScheme ? withOpacity(colors.card, 0.68) : colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: withOpacity(colors.border, 0.9),
        overflow: 'hidden',
      }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <PaperText variant="titleMedium" style={{ color: colors.foreground }}>
          Theme
        </PaperText>
        <PaperText variant="bodySmall" style={{ color: colors.mutedForeground }}>
          Choose the app color scheme
        </PaperText>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        {THEMES.map((t) => {
          const active = colorScheme === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setColorScheme(t.value)}
              android_ripple={{ color: withOpacity(colors.foreground, 0.14) }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: active ? colors.primary : withOpacity(colors.border, 0.9),
                backgroundColor: active ? withOpacity(colors.primary, 0.12) : 'transparent',
              }}>
              <MaterialSymbol
                name={t.icon}
                size={26}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <PaperText
                variant="labelLarge"
                style={{ color: active ? colors.primary : colors.foreground }}>
                {t.label}
              </PaperText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
