import type { Ref } from 'react';
import { TextInput, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { Input } from './Input';

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
  const clear = onClear ?? (() => onChangeText(''));

  return (
    <Input
      {...inputProps}
      inputRef={inputRef}
      value={value}
      onChangeText={onChangeText}
      onClear={clear}
      placeholder={placeholder}
      variant="search"
      style={style}
    />
  );
}
