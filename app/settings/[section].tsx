import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack as JsStack } from 'expo-router/js-stack';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app/AppHeader';
import { AboutBody } from '@/components/app/settings/AboutBody';
import { AppearanceBody } from '@/components/app/settings/AppearanceBody';
import { ComponentsBody } from '@/components/app/settings/ComponentsBody';
import { MaterialSymbol } from '@/components/ui/MaterialSymbol';
import { ToolbarGroup, ToolbarItem, ToolbarSeparator } from '@/components/ui/Toolbar';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

const TITLES = { appearance: 'Appearance', about: 'About', components: 'Components' } as const;

// di luar Drawer (kayak note/[id]) → sidebar kekunci otomatis,
// header cuma back button, ga ada tombol drawer.
export default function SettingsDetailScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { colors, isDarkColorScheme, toggleColorScheme } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const title =
    section === 'appearance' || section === 'about' || section === 'components'
      ? TITLES[section]
      : null;
  const isComponents = section === 'components';
  const [showAudit, setShowAudit] = useState(false);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <JsStack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 78,
          paddingBottom: insets.bottom + 32,
          gap: 12,
        }}>
        {section === 'appearance' ? (
          <AppearanceBody />
        ) : section === 'about' ? (
          <AboutBody />
        ) : section === 'components' ? (
          <ComponentsBody showAudit={showAudit} />
        ) : (
          <View className="flex-1 items-center justify-center gap-2 px-8">
            <MaterialSymbol name="error" size={40} color={colors.mutedForeground} />
            <PaperText variant="titleMedium" style={{ color: colors.foreground }}>
              Not found
            </PaperText>
            <PaperText
              variant="bodyMedium"
              style={{ color: colors.primary }}
              onPress={() => router.back()}>
              Go back
            </PaperText>
          </View>
        )}
      </ScrollView>
      {/* header melayang kayak note/[id]: konten ngescroll dari belakang header + gradient */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <AppHeader
          variant="detail"
          title={title ?? 'Settings'}
          onLeftPress={() => router.back()}
          trailing={
            isComponents ? (
              <ToolbarGroup accessibilityLabel="Components actions">
                <ToolbarItem
                  grouped
                  icon={isDarkColorScheme ? 'light_mode' : 'dark_mode'}
                  iconSize={26}
                  accessibilityLabel={isDarkColorScheme ? 'Switch to light' : 'Switch to dark'}
                  onPress={toggleColorScheme}
                />
                <ToolbarSeparator />
                <ToolbarItem
                  grouped
                  icon="fact_check"
                  iconSize={26}
                  accessibilityLabel={showAudit ? 'Hide audit' : 'Show audit'}
                  onPress={() => setShowAudit((v) => !v)}
                  style={
                    showAudit ? { backgroundColor: withOpacity(colors.primary, 0.12) } : undefined
                  }
                />
              </ToolbarGroup>
            ) : undefined
          }
        />
      </View>
    </View>
  );
}
