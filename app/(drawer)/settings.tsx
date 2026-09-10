import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialSymbol } from '@/components/ui/MaterialSymbol';

import { AppHeader } from '@/components/app/AppHeader';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

export type SettingsSectionId = 'appearance' | 'about';

const THEME_LABELS = { light: 'Light', dark: 'Dark', system: 'System' } as const;

function SettingsRow({
  icon,
  title,
  value,
  onPress,
  last,
}: {
  icon: string;
  title: string;
  value: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors } = useColorScheme();
  return (
    <View>
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 px-4 py-3 active:opacity-80"
        android_ripple={{ color: withOpacity(colors.foreground, 0.14), borderless: false }}
        style={({ pressed }) => [pressed && { opacity: 0.82 }]}>
        <MaterialSymbol name={icon} size={24} color={colors.foreground} />
        <PaperText variant="bodyLarge" style={{ color: colors.foreground, flex: 1 }}>
          {title}
        </PaperText>
        <PaperText variant="bodyMedium" style={{ color: colors.mutedForeground }}>
          {value}
        </PaperText>
        <MaterialSymbol name="chevron_right" size={24} color={colors.mutedForeground} />
      </Pressable>
      {last ? null : (
        <View
          className="ml-14 mr-4 h-px"
          style={{ backgroundColor: withOpacity(colors.border, 0.9) }}
        />
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const { colors, colorScheme, isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({ swipeEnabled: true });
    }, [navigation])
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <AppHeader variant="settings" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: insets.bottom + 32,
          gap: 12,
        }}>
        <View
          style={{
            backgroundColor: isDarkColorScheme ? withOpacity(colors.card, 0.68) : colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: withOpacity(colors.border, 0.9),
            overflow: 'hidden',
          }}>
          <SettingsRow
            icon="palette"
            title="Appearance"
            value={THEME_LABELS[colorScheme]}
            onPress={() => router.push('/settings/appearance')}
          />
          <SettingsRow
            icon="info"
            title="About"
            value="v1.0.0"
            onPress={() => router.push('/settings/about')}
            last
          />
        </View>
      </ScrollView>
    </View>
  );
}
