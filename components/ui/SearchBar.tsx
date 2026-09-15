import { MaterialSymbol } from './MaterialSymbol';
import type { Ref } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

export type SearchBarProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> & {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
  onClear?: () => void;
  /** ref ke TextInput dalem — buat blur eksplisit (mis. sebelum sheet kebuka). */
  inputRef?: Ref<TextInput>;
};

export function SearchBar({
  value,
  onChangeText,
  onClear,
  inputRef,
  placeholder = 'Search',
  style,
  ...inputProps
}: SearchBarProps) {
  const { colors } = useColorScheme();
  const clear = onClear ?? (() => onChangeText(''));

  return (
    <View
      style={[
        {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          height: 48,
          borderRadius: 100,
          borderWidth: 1,
          borderColor: withOpacity(colors.border, 0.9),
          backgroundColor: colors.card,
          paddingHorizontal: 12,
        },
        style,
      ]}>
      <MaterialSymbol name="search" size={26} color={colors.mutedForeground} />
      <TextInput
        {...inputProps}
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        accessibilityLabel={inputProps.accessibilityLabel ?? placeholder}
        style={{
          flex: 1,
          color: colors.foreground,
          fontSize: 18,
          paddingVertical: 0,
        }}
        returnKeyType={inputProps.returnKeyType ?? 'search'}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={clear}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={4}
          android_ripple={{
            color: withOpacity(colors.foreground, 0.2),
            borderless: false,
            foreground: true,
            radius: 22,
          }}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.72 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}>
          <MaterialSymbol name="close" size={26} color={colors.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}
