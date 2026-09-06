import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from 'expo-router';
import { useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import { DrawerActions } from 'expo-router/react-navigation';
import { Menu } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { ToolbarItem, ToolbarItemGroup } from '@/components/Toolbar';
import { getSpaceById } from '@/lib/paperite-data';
import { useSpace } from '@/lib/SpaceContext';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

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
    backgroundColor: withOpacity(colors.card, 0.94),
    borderWidth: 1,
    borderColor: withOpacity(colors.border, 0.9),
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

      <View style={{ height: HEADER_H, flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 8,
            paddingRight: 8,
            minWidth: 0,
          }}>
          <ToolbarItem
            onPress={onLeftPress ?? (() => navigation.dispatch(DrawerActions.openDrawer()))}
            accessibilityLabel={leftIcon === 'back' ? 'Back' : 'Open drawer'}
            icon={leftIcon === 'back' ? 'chevron-left' : undefined}
            iconSize={leftIcon === 'back' ? 32 : 24}
            hitSlop={12}>
            {leftIcon === 'drawer' ? (
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
            ) : null}
          </ToolbarItem>

          {showCenter ? (
            <View
              style={{
                ...floatingSurface,
                height: 48,
                maxWidth: '100%',
                paddingHorizontal: 16,
                borderRadius: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                flexShrink: 1,
                minWidth: 0,
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
          ) : null}
        </View>

        <View
          style={{
            paddingRight: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: showUndoRedo ? 12 : 0,
            flexShrink: 0,
          }}>
          {showUndoRedo ? (
            <ToolbarItemGroup
              accessibilityLabel="Edit actions"
              actions={[
                { icon: 'undo', iconSize: 22, onPress: onUndoPress, accessibilityLabel: 'Undo' },
                { icon: 'redo', iconSize: 22, onPress: onRedoPress, accessibilityLabel: 'Redo' },
              ]}
            />
          ) : null}

          <Menu
            visible={menuOpen}
            onDismiss={() => setMenuOpen(false)}
            anchor={
              <ToolbarItem
                onPress={() => setMenuOpen(true)}
                hitSlop={12}
                icon="more-vert"
                accessibilityLabel="More options"
              />
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
