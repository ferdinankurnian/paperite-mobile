import { Pressable, View } from 'react-native';
import Animated, { LayoutAnimationConfig, ZoomInRotate } from 'react-native-reanimated';

import { MaterialSymbol } from '@/components/ui/MaterialSymbol';
import { cn } from '@/lib/cn';
import { useColorScheme } from '@/lib/useColorScheme';
import { COLORS } from '@/theme/colors';

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  return (
    <LayoutAnimationConfig skipEntering>
      <Animated.View
        className="items-center justify-center"
        key={`toggle-${colorScheme}`}
        entering={ZoomInRotate}>
        <Pressable onPress={toggleColorScheme} className="opacity-80">
          {colorScheme === 'dark'
            ? ({ pressed }) => (
                <View className={cn('px-0.5', pressed && 'opacity-50')}>
                  <MaterialSymbol name="light_mode" size={26} color={COLORS.white} />
                </View>
              )
            : ({ pressed }) => (
                <View className={cn('px-0.5', pressed && 'opacity-50')}>
                  <MaterialSymbol name="dark_mode" size={26} color={COLORS.black} />
                </View>
              )}
        </Pressable>
      </Animated.View>
    </LayoutAnimationConfig>
  );
}
