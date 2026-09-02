import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/lib/useColorScheme';

export const Container = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useColorScheme();

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: 24,
        paddingRight: 24,
        backgroundColor: colors.background,
      }}
    >
      {children}
    </View>
  );
};
