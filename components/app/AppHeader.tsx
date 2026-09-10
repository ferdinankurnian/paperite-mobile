import { useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import { useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { MobileEditor } from '@/lib/editor/types';

import { ToolbarItem, ToolbarItemGroup } from '@/components/ui/Toolbar';
import { MaterialSymbol } from '@/components/ui/MaterialSymbol';
import { SpaceIcon } from '@/lib/space-icons';
import { ToolbarMenu } from '@/components/ui/ToolbarMenu';
import { NoteMenu } from '@/components/app/NoteMenu';
import { useSpace } from '@/lib/SpaceContext';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';
import type { Note } from '@/lib/paperite-data';

const HEADER_H = 56;
const HEADER_GRADIENT_EXTRA_H = 16;

type AppHeaderProps = {
  variant?: 'space' | 'editor' | 'settings' | 'detail';
  onLeftPress?: () => void;
  onUndoPress?: () => void;
  onRedoPress?: () => void;
  /** detail variant: judul pill */
  title?: string;
  /** editor variant: note + bridge buat NoteMenu (parity dropdown desktop) */
  note?: Note;
  getEditor?: () => MobileEditor | null;
};

export function AppHeader({
  variant = 'space',
  onLeftPress,
  onUndoPress,
  onRedoPress,
  title,
  note,
  getEditor,
}: AppHeaderProps) {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { activeSpace, activeSpaceName } = useSpace();
  const iconColor = activeSpace?.color ?? colors.foreground;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const floatingSurface = {
    backgroundColor: withOpacity(colors.card, 0.94),
    borderWidth: 1,
    borderColor: withOpacity(colors.border, 0.9),
  } as const;
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };
  const gradientHeight = size.h + HEADER_GRADIENT_EXTRA_H;
  const isEditor = variant === 'editor';
  const isSettings = variant === 'settings';
  const isDetail = variant === 'detail';
  const showBack = isEditor || isDetail;

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
            accessibilityLabel={showBack ? 'Back' : 'Open drawer'}
            icon={showBack ? 'arrow_back_ios_new' : undefined}
            iconSize={26}
            hitSlop={12}>
            {showBack ? null : (
              <MaterialSymbol name="dock_to_right" size={26} color={colors.foreground} />
            )}
          </ToolbarItem>

          {isEditor ? null : isDetail ? (
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
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 17,
                  fontWeight: '600',
                  flexShrink: 1,
                  minWidth: 0,
                }}
                numberOfLines={1}>
                {title ?? 'Settings'}
              </Text>
            </View>
          ) : isSettings ? (
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
              <MaterialSymbol name="settings" size={26} color={colors.foreground} />
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 17,
                  fontWeight: '600',
                  flexShrink: 1,
                  minWidth: 0,
                }}
                numberOfLines={1}>
                Settings
              </Text>
            </View>
          ) : (
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
              <SpaceIcon name={activeSpace?.icon ?? 'folder'} size={20} color={iconColor} />
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
          )}
        </View>

        <View
          style={{
            paddingRight: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: isEditor ? 12 : 0,
            flexShrink: 0,
          }}>
          {isEditor ? (
            <ToolbarItemGroup
              accessibilityLabel="Edit actions"
              actions={[
                { icon: 'undo', iconSize: 26, onPress: onUndoPress, accessibilityLabel: 'Undo' },
                { icon: 'redo', iconSize: 26, onPress: onRedoPress, accessibilityLabel: 'Redo' },
              ]}
            />
          ) : null}

          {isEditor ? (
            note && getEditor ? (
              <NoteMenu note={note} getEditor={getEditor} />
            ) : null
          ) : isSettings || isDetail ? null : (
            <ToolbarMenu
              actions={[
                {
                  title: 'Rename',
                  icon: 'edit',
                  accessibilityLabel: 'Rename',
                  onPress: () => {},
                },
                {
                  title: 'Sort',
                  icon: 'sort',
                  accessibilityLabel: 'Sort',
                  onPress: () => {},
                },
                {
                  title: 'Select',
                  icon: 'check_box',
                  accessibilityLabel: 'Select',
                  onPress: () => {},
                },
              ]}
            />
          )}
        </View>
      </View>
    </View>
  );
}
