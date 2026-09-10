import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack as JsStack } from 'expo-router/js-stack';
import { Pressable, ScrollView, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialSymbol } from '@/components/ui/MaterialSymbol';

import { AppHeader } from '@/components/app/AppHeader';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

const THEMES = [
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
  { value: 'system', label: 'System', icon: 'settings_brightness' },
] as const;

const TITLES = { appearance: 'Appearance', about: 'About' } as const;

function AppearanceBody() {
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
          pilih color scheme aplikasi
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

function AboutBody() {
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
        mobile companion buat paperite desktop · v1.0.0
      </PaperText>
    </View>
  );
}

// di luar Drawer (kayak note/[id]) → sidebar kekunci otomatis,
// header cuma back button, ga ada tombol drawer.
export default function SettingsDetailScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const title = section === 'appearance' || section === 'about' ? TITLES[section] : null;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <JsStack.Screen options={{ headerShown: false }} />
      <AppHeader variant="detail" title={title ?? 'Settings'} onLeftPress={() => router.back()} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: insets.bottom + 32,
          gap: 12,
        }}>
        {section === 'appearance' ? (
          <AppearanceBody />
        ) : section === 'about' ? (
          <AboutBody />
        ) : (
          <View className="flex-1 items-center justify-center gap-2 px-8">
            <MaterialSymbol name="error" size={40} color={colors.mutedForeground} />
            <PaperText variant="titleMedium" style={{ color: colors.foreground }}>
              ga ketemu
            </PaperText>
            <PaperText
              variant="bodyMedium"
              style={{ color: colors.primary }}
              onPress={() => router.back()}>
              balik
            </PaperText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
