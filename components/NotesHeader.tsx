import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from 'expo-router';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { DrawerActions } from 'expo-router/react-navigation';
import { Menu } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { getSpaceById } from '@/lib/paperite-data';
import { useSpace } from '@/lib/SpaceContext';
import { useColorScheme } from '@/lib/useColorScheme';

const HEADER_H = 56;
const HEADER_GRADIENT_EXTRA_H = 16;

type NotesHeaderProps = {
  showCenter?: boolean;
  onLeftPress?: () => void;
  leftIcon?: 'drawer' | 'back';
  showUndoRedo?: boolean;
  onUndoPress?: () => void;
  onRedoPress?: () => void;
};

export function NotesHeader({
  showCenter = true,
  onLeftPress,
  leftIcon = 'drawer',
  showUndoRedo = false,
  onUndoPress,
  onRedoPress,
}: NotesHeaderProps) {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { activeSpaceId, activeSpaceName } = useSpace();
  const space = getSpaceById(activeSpaceId);
  const icon = (space?.icon ?? 'folder') as keyof typeof MaterialIcons.glyphMap;
  const [menuOpen, setMenuOpen] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const floatingSurface = {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  } as const;
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };
  const gradientHeight = size.h + HEADER_GRADIENT_EXTRA_H;

  return (
    <View
      onLayout={onLayout}
      style={{
        paddingTop: insets.top + 6,
        paddingHorizontal: 4,
        paddingBottom: 8,
        backgroundColor: 'transparent',
        overflow: 'visible',
      }}>
      {size.w > 0 && size.h > 0 ? (
        <Svg
          pointerEvents="none"
          width={size.w}
          height={gradientHeight}
          style={{ position: 'absolute', left: 0, top: 0 }}>
          <Defs>
            <LinearGradient id="headerFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.background} stopOpacity="1" />
              <Stop offset="0.65" stopColor={colors.background} stopOpacity="0.85" />
              <Stop offset="1" stopColor={colors.background} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={gradientHeight} fill="url(#headerFade)" />
        </Svg>
      ) : null}

      <View style={{ height: HEADER_H, justifyContent: 'center' }}>
        {showCenter ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View
              style={{
                ...floatingSurface,
                height: 48,
                maxWidth: '60%',
                paddingHorizontal: 16,
                borderRadius: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
              <MaterialIcons name={icon} size={20} color={colors.foreground} />
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 17,
                  fontWeight: '600',
                  flexShrink: 1,
                  minWidth: 0,
                }}
                numberOfLines={1}>
                {activeSpaceName}
              </Text>
            </View>
          </View>
        ) : null}

        <View
          style={{ position: 'absolute', left: 8, top: 0, bottom: 0, justifyContent: 'center' }}>
          <Pressable
            onPress={onLeftPress ?? (() => navigation.dispatch(DrawerActions.openDrawer()))}
            hitSlop={12}
            style={{
              ...floatingSurface,
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {leftIcon === 'back' ? (
              <MaterialIcons name="chevron-left" size={32} color={colors.foreground} />
            ) : (
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: 'MaterialSymbols_400Regular',
                  fontSize: 28,
                  lineHeight: 28,
                  includeFontPadding: false,
                }}>
                dock_to_right
              </Text>
            )}
          </Pressable>
        </View>

        <View
          style={{
            position: 'absolute',
            right: 8,
            top: 0,
            bottom: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: showUndoRedo ? 12 : 0,
          }}>
          {showUndoRedo ? (
            <>
              <Pressable
                onPress={onUndoPress}
                accessibilityLabel="Undo"
                style={{
                  ...floatingSurface,
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcons name="undo" size={22} color={colors.foreground} />
              </Pressable>
              <Pressable
                onPress={onRedoPress}
                accessibilityLabel="Redo"
                style={{
                  ...floatingSurface,
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcons name="redo" size={22} color={colors.foreground} />
              </Pressable>
            </>
          ) : null}

          <Menu
            visible={menuOpen}
            onDismiss={() => setMenuOpen(false)}
            anchor={
              <Pressable
                onPress={() => setMenuOpen(true)}
                hitSlop={12}
                style={{
                  ...floatingSurface,
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel="More options">
                <MaterialIcons name="more-vert" size={24} color={colors.foreground} />
              </Pressable>
            }
            contentStyle={{ backgroundColor: colors.card }}>
            <Menu.Item
              onPress={() => setMenuOpen(false)}
              title="Rename"
              leadingIcon="pencil-outline"
              titleStyle={{ color: colors.foreground }}
            />
            <Menu.Item
              onPress={() => setMenuOpen(false)}
              title="Sort"
              leadingIcon="sort"
              titleStyle={{ color: colors.foreground }}
            />
            <Menu.Item
              onPress={() => setMenuOpen(false)}
              title="Select"
              leadingIcon="checkbox-marked-outline"
              titleStyle={{ color: colors.foreground }}
            />
          </Menu>
        </View>
      </View>
    </View>
  );
}
