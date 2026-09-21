import type { Ref } from 'react';
import {
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { TouchableRipple } from 'react-native-paper';

import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

import { MaterialSymbol } from './MaterialSymbol';

const INPUT_ACTION_SIZE = 40;
const INPUT_ACTION_RADIUS = INPUT_ACTION_SIZE / 2;

export type InputVariant = 'default' | 'search' | 'leading-icon' | 'trailing-icon';

export type InputProps = Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> & {
  /** Controlled value. Leave undefined to use TextInput's native uncontrolled mode. */
  value?: string;
  onChangeText?: (text: string) => void;
  /** Style for the outer field surface. */
  style?: StyleProp<ViewStyle>;
  /** Style for the native TextInput itself. */
  inputStyle?: StyleProp<TextStyle>;
  /** Ref ke TextInput dalem. */
  inputRef?: Ref<TextInput>;
  variant?: InputVariant;
  /** Material Symbol name for leading-icon and trailing-icon variants. */
  icon?: string;
  iconSize?: number;
  onIconPress?: () => void;
  iconAccessibilityLabel?: string;
  /** Shows a clear action when value is not empty. Search enables this by default. */
  clearable?: boolean;
  onClear?: () => void;
};

export function Input({
  value,
  onChangeText,
  placeholder,
  inputRef,
  variant = 'default',
  icon,
  iconSize = 24,
  onIconPress,
  iconAccessibilityLabel,
  clearable,
  onClear,
  style,
  inputStyle,
  accessibilityLabel,
  placeholderTextColor,
  onFocus,
  onBlur,
  returnKeyType,
  ...inputProps
}: InputProps) {
  const { colors } = useColorScheme();
  const leadingIcon =
    variant === 'search' ? (icon ?? 'search') : variant === 'leading-icon' ? icon : undefined;
  const trailingIcon = variant === 'trailing-icon' ? icon : undefined;
  const showClear = (clearable ?? variant === 'search') && Boolean(value?.length);
  const hasTrailingAction = Boolean((trailingIcon && onIconPress) || showClear);

  return (
    <View
      style={[
        {
          flex: 1,
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          minHeight: 48,
          // input follows the same floating-pill language as SearchBar and
          // toolbar surfaces; all variants keep one consistent silhouette.
          borderRadius: 999,
          borderWidth: 1,
          borderColor: withOpacity(colors.border, 0.9),
          backgroundColor: colors.card,
          paddingHorizontal: 12,
          paddingRight: hasTrailingAction ? 0 : 12,
        },
        style,
      ]}>
      {leadingIcon ? (
        <MaterialSymbol name={leadingIcon} size={iconSize} color={colors.mutedForeground} />
      ) : null}
      <TextInput
        {...inputProps}
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        style={[
          {
            flex: 1,
            minWidth: 0,
            color: colors.foreground,
            fontSize: 18,
            paddingVertical: 0,
          },
          inputStyle,
        ]}
        returnKeyType={returnKeyType ?? (variant === 'search' ? 'search' : undefined)}
      />
      {trailingIcon ? (
        onIconPress ? (
          <InputAction
            icon={trailingIcon}
            color={colors.mutedForeground}
            accessibilityLabel={iconAccessibilityLabel ?? trailingIcon}
            onPress={onIconPress}
          />
        ) : (
          <MaterialSymbol name={trailingIcon} size={iconSize} color={colors.mutedForeground} />
        )
      ) : null}
      {showClear ? (
        <InputAction
          icon="close"
          color={colors.mutedForeground}
          accessibilityLabel="Clear input"
          onPress={onClear ?? (() => onChangeText?.(''))}
        />
      ) : null}
    </View>
  );
}

function InputAction({
  icon,
  color,
  accessibilityLabel,
  onPress,
}: {
  icon: string;
  color: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <View
      style={{
        width: INPUT_ACTION_SIZE,
        height: INPUT_ACTION_SIZE,
        minWidth: INPUT_ACTION_SIZE,
        flexShrink: 0,
        borderRadius: INPUT_ACTION_RADIUS,
        overflow: 'hidden',
      }}>
      <TouchableRipple
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        borderless
        centered
        hitSlop={4}
        rippleColor={withOpacity(color, 0.2)}
        style={{
          width: INPUT_ACTION_SIZE,
          height: INPUT_ACTION_SIZE,
          borderRadius: INPUT_ACTION_RADIUS,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MaterialSymbol name={icon} size={26} color={color} />
      </TouchableRipple>
    </View>
  );
}
