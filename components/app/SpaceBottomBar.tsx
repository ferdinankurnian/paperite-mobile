import { router } from 'expo-router';
import { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { ToolbarItem } from '@/components/ui/Toolbar';
import { MaterialSymbol } from '@/components/ui/MaterialSymbol';
import { SearchBar } from '@/components/ui/SearchBar';
import { useSpace } from '@/lib/SpaceContext';
import { useColorScheme } from '@/lib/useColorScheme';

type Props = {
  search: string;
  onSearchChange: (text: string) => void;
  showNewFolder?: boolean;
  showAdd?: boolean;
  onNewFolder?: () => void;
};

export function SpaceBottomBar({
  search,
  onSearchChange,
  showNewFolder = false,
  showAdd = true,
  onNewFolder,
}: Props) {
  const { colors, isDarkColorScheme } = useColorScheme();
  const { activeSpaceId } = useSpace();
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
            <ToolbarItem
              onPress={onNewFolder}
              accessibilityLabel="New folder"
              icon="create_new_folder"
              iconSize={26}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.secondary,
                borderWidth: 0,
              }}
            />
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <SearchBar
            value={search}
            onChangeText={onSearchChange}
            accessibilityLabel="Search notes"
          />

          {showAdd ? (
            <ToolbarItem
              onPress={() =>
                router.push({
                  pathname: '/note/[id]',
                  params: { id: 'new', spaceId: activeSpaceId },
                })
              }
              accessibilityLabel="New note"
              style={{
                backgroundColor: colors.primary,
                borderColor: fabBorderColor,
              }}>
              <MaterialSymbol name="edit_square" size={26} color={colors.primaryForeground} />
            </ToolbarItem>
          ) : null}
        </View>
      </View>
    </KeyboardStickyView>
  );
}
