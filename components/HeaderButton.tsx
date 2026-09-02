import { forwardRef } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet } from 'react-native';

import { useColorScheme } from '@/lib/useColorScheme';

export const HeaderButton = forwardRef<typeof Pressable, { onPress?: () => void }>(
  ({ onPress }, _ref) => {
    const { colors } = useColorScheme();

    return (
      <Pressable onPress={onPress} hitSlop={8}>
        {({ pressed }) => (
          <MaterialIcons
            name="info-outline"
            size={24}
            color={colors.foreground}
            style={[styles.headerRight, { opacity: pressed ? 0.5 : 1 }]}
          />
        )}
      </Pressable>
    );
  }
);

HeaderButton.displayName = 'HeaderButton';

const styles = StyleSheet.create({
  headerRight: {
    marginRight: 15,
  },
});
