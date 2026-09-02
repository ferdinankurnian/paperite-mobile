import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useColorScheme } from '@/lib/useColorScheme';

type Props = {
  search: string;
  onSearchChange: (text: string) => void;
  showNewFolder?: boolean;
  showAdd?: boolean;
};

export function NotesFab({ search, onSearchChange, showNewFolder = false, showAdd = true }: Props) {
  const { colors, isDarkColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const fabBorderColor = isDarkColorScheme ? 'rgb(255, 170, 30)' : 'rgb(194, 58, 80)';

  // padding tetap (bg solid sampai bawah) — ga diubah biar ga flash
  // closed: jarak 16 + safe area
  // opened: +insets.bottom → kompensasi padding, sisa ~16 nempel di atas keyboard
  const paddingBottom = insets.bottom + 16;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  return (
    <KeyboardStickyView
      offset={{ closed: 0, opened: insets.bottom }}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: -1,
      }}>
      <View
        pointerEvents="box-none"
        onLayout={onLayout}
        style={{
          paddingHorizontal: 12,
          paddingBottom,
          paddingTop: 8,
          gap: 10,
        }}>
        {/* fade: atas transparent → bawah solid bg */}
        {size.w > 0 && size.h > 0 ? (
          <Svg
            pointerEvents="none"
            width={size.w}
            height={size.h}
            style={{ position: 'absolute', left: 0, top: 0 }}>
            <Defs>
              <LinearGradient id="fabFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.background} stopOpacity="0" />
                <Stop offset="0.5" stopColor={colors.background} stopOpacity="0.85" />
                <Stop offset="1" stopColor={colors.background} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={size.w} height={size.h} fill="url(#fabFade)" />
          </Svg>
        ) : null}
        {showNewFolder ? (
          <View style={{ alignItems: 'flex-end', paddingRight: 4 }}>
            <Pressable
              onPress={() => {
                // placeholder — folder create nanti
              }}
              accessibilityLabel="New folder"
              style={{
                width: 40,
                height: 40,
                borderRadius: 32,
                backgroundColor: colors.secondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcons
                name="create-new-folder"
                size={22}
                color={colors.secondaryForeground}
              />
            </Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              height: 48,
              borderRadius: 100,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              paddingHorizontal: 12,
            }}>
            <MaterialIcons name="search" size={24} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={onSearchChange}
              placeholder="Search"
              placeholderTextColor={colors.mutedForeground}
              style={{
                flex: 1,
                color: colors.foreground,
                fontSize: 18,
                paddingVertical: 0,
              }}
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <Pressable
                onPress={() => onSearchChange('')}
                accessibilityLabel="Clear search"
                hitSlop={4}
                style={({ pressed }) => [
                  {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  pressed && { opacity: 0.72, transform: [{ scale: 0.96 }] },
                ]}>
                <MaterialIcons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>

          {showAdd ? (
            <Pressable
              onPress={() => router.push('/note/new')}
              accessibilityLabel="New note"
              style={{
                width: 48,
                height: 48,
                borderRadius: 100,
                backgroundColor: colors.primary,
                borderWidth: 1,
                borderColor: fabBorderColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text
                style={{
                  color: colors.primaryForeground,
                  fontFamily: 'MaterialSymbols_400Regular',
                  fontSize: 28,
                  lineHeight: 28,
                  includeFontPadding: false,
                }}>
                edit_square
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </KeyboardStickyView>
  );
}
