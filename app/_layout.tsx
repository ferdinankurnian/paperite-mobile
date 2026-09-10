import '../global.css';
import 'expo-dev-client';
import { Courgette_400Regular } from '@expo-google-fonts/courgette';
import { MaterialSymbols_400Regular } from '@expo-google-fonts/material-symbols/400Regular';
import { ThemeProvider as NavThemeProvider } from 'expo-router/react-navigation';
import { PaperProvider, MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { PortalHost } from '@rn-primitives/portal';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { Stack as JsStack } from 'expo-router/js-stack';
import { TransitionPresets } from 'expo-router/build/react-navigation/stack';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';

import { ThemeToggle } from '@/components/nativewindui/ThemeToggle';
import { SpaceProvider } from '@/lib/SpaceContext';
import { useColorScheme } from '@/lib/useColorScheme';
import { NAV_THEME } from '@/theme';
import { COLORS } from '@/theme/colors';

export { ErrorBoundary } from 'expo-router';

function buildPaperTheme(isDark: boolean): MD3Theme {
  const c = isDark ? COLORS.dark : COLORS.light;
  const base = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      onPrimary: c.primaryForeground,
      primaryContainer: isDark ? 'rgb(67, 40, 20)' : 'rgb(255, 237, 213)',
      onPrimaryContainer: isDark ? 'rgb(254, 215, 170)' : 'rgb(154, 52, 18)',
      secondary: c.secondary,
      onSecondary: c.secondaryForeground,
      secondaryContainer: c.muted,
      onSecondaryContainer: c.secondaryForeground,
      tertiary: c.primary,
      onTertiary: c.primaryForeground,
      tertiaryContainer: isDark ? 'rgb(67, 40, 20)' : 'rgb(255, 237, 213)',
      onTertiaryContainer: isDark ? 'rgb(254, 215, 170)' : 'rgb(154, 52, 18)',
      error: c.destructive,
      background: c.background,
      onBackground: c.foreground,
      surface: c.card,
      onSurface: c.cardForeground,
      surfaceVariant: c.grey5,
      onSurfaceVariant: c.mutedForeground,
      outline: c.border,
      outlineVariant: c.grey4,
      elevation: {
        ...base.colors.elevation,
        level0: c.background,
        level1: c.card,
        level2: c.grey6,
        level3: c.grey5,
        level4: c.grey5,
        level5: c.grey4,
      },
    },
  };
}

export default function RootLayout() {
  const { colorScheme, isDarkColorScheme, colors } = useColorScheme();
  const paperTheme = buildPaperTheme(isDarkColorScheme);
  const [fontsLoaded] = useFonts({ Courgette_400Regular, MaterialSymbols_400Regular });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <StatusBar
          key={`root-status-bar-${isDarkColorScheme ? 'light' : 'dark'}`}
          style={isDarkColorScheme ? 'light' : 'dark'}
          translucent
        />
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <SpaceProvider>
            <BottomSheetModalProvider>
              <ActionSheetProvider>
                <>
                  <NavThemeProvider value={NAV_THEME[colorScheme]}>
                    <JsStack
                      detachInactiveScreens={false}
                      screenOptions={{
                        ...SCREEN_OPTIONS,
                        cardStyle: { backgroundColor: colors.background },
                      }}>
                      <JsStack.Screen name="(drawer)" options={{ headerShown: false }} />
                      <JsStack.Screen
                        name="note/[id]"
                        options={{
                          presentation: 'card',
                          gestureEnabled: false,
                          cardStyle: { backgroundColor: colors.background },
                          ...TransitionPresets.SlideFromRightIOS,
                        }}
                      />
                      <JsStack.Screen
                        name="note/new"
                        options={{
                          presentation: 'card',
                          ...TransitionPresets.SlideFromRightIOS,
                        }}
                      />
                      <JsStack.Screen
                        name="settings/[section]"
                        options={{
                          presentation: 'card',
                          cardStyle: { backgroundColor: colors.background },
                          ...TransitionPresets.SlideFromRightIOS,
                        }}
                      />
                      <JsStack.Screen name="modal" options={MODAL_OPTIONS} />
                    </JsStack>
                  </NavThemeProvider>
                  <PortalHost />
                </>
              </ActionSheetProvider>
            </BottomSheetModalProvider>
          </SpaceProvider>
        </KeyboardProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const SCREEN_OPTIONS = {
  ...TransitionPresets.SlideFromRightIOS,
} as const;

const MODAL_OPTIONS = {
  presentation: 'modal',
  ...TransitionPresets.ModalSlideFromBottomIOS,
  title: 'Settings',
  headerRight: () => <ThemeToggle />,
} as const;
