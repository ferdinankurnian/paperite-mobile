import { useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import { useState, type ReactNode } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { MobileEditor } from '@/lib/editor/types';

import {
  ToolbarItem,
  ToolbarItemGroup,
  ToolbarGroup,
  ToolbarSeparator,
} from '@/components/ui/Toolbar';
import { MaterialSymbol } from '@/components/ui/MaterialSymbol';
import { SaveStatusText, type SaveStatus } from '@/components/app/SaveStatusText';
import { SpaceIcon } from '@/lib/space-icons';
import { TRASH_ID } from '@/lib/storage/files';
import { ToolbarMenu, type ToolbarMenuEntry } from '@/components/ui/ToolbarMenu';
import { NoteMenu } from '@/components/app/NoteMenu';
import { useListActions } from '@/lib/list-actions';
import { LIST_SORT_LABELS, LIST_SORT_ORDERS, useListOptions } from '@/lib/list-options';
import { useSpace } from '@/lib/SpaceContext';
import { useSelection } from '@/lib/selection';
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
  /** editor variant: pin toggle dari NoteMenu → screen update state lokal */
  onPinnedChange?: (pinned: boolean) => void;
  /** editor variant: status autosave, tampil di sebelah back button */
  saveStatus?: SaveStatus;
  /** kanan atas custom — dipake halaman components buat tombol audit */
  trailing?: ReactNode;
};

export function AppHeader({
  variant = 'space',
  onLeftPress,
  onUndoPress,
  onRedoPress,
  title,
  note,
  getEditor,
  onPinnedChange,
  saveStatus = 'idle',
  trailing,
}: AppHeaderProps) {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { activeSpace, activeSpaceName, activeSpaceId } = useSpace();
  const {
    sortOrder,
    setSortOrder,
    foldersFirst,
    setFoldersFirst,
    showPreview,
    setShowPreview,
    hasFolders,
  } = useListOptions();
  const isTrashSpace = activeSpaceId === TRASH_ID;
  const {
    selecting,
    selectedCount,
    selectedIds,
    allIds,
    toggleSelectAll,
    enterSelection,
    exitSelection,
  } = useSelection();
  const { bulkDelete, requestMove } = useListActions();
  // parity dropdown desktop (app-sidebar "Sort by" + "Folder first" +
  // "Note previews"). custom sort + grid view belum ada di mobile — sengaja
  // ga ditampilin. trash ga dapet menu sort (desktop juga gitu).
  const spaceMenuEntries: ToolbarMenuEntry[] = isTrashSpace
    ? [
        {
          title: 'Select',
          icon: 'check_box',
          accessibilityLabel: 'Select',
          onPress: () => enterSelection(),
        },
      ]
    : [
        {
          type: 'submenu',
          title: 'Sort by',
          icon: 'sort',
          accessibilityLabel: 'Sort by',
          children: LIST_SORT_ORDERS.map((order) => ({
            title: LIST_SORT_LABELS[order],
            accessibilityLabel: `Sort by ${LIST_SORT_LABELS[order]}`,
            selected: sortOrder === order,
            onPress: () => setSortOrder(order),
          })),
        },
        // inbox ga bisa punya folder (create + move ga nyampe sana) — toggle
        // ini disembunyiin kalo lagi ga ada folder biar ga jadi hiasan.
        ...(hasFolders
          ? [
              {
                title: 'Folders first',
                accessibilityLabel: 'Toggle folders first',
                selected: foldersFirst,
                onPress: () => setFoldersFirst(!foldersFirst),
              } as const,
            ]
          : []),
        {
          title: 'Show previews',
          accessibilityLabel: 'Toggle note previews',
          selected: showPreview,
          onPress: () => setShowPreview(!showPreview),
        },
        { type: 'separator' },
        {
          title: 'Select',
          icon: 'check_box',
          accessibilityLabel: 'Select',
          onPress: () => enterSelection(),
        },
      ];
  const isSpaceSelecting = variant === 'space' && selecting;
  const allSelected = allIds.length > 0 && selectedCount >= allIds.length;
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
          {isSpaceSelecting ? (
            <ToolbarItem
              onPress={exitSelection}
              accessibilityLabel="Exit selection"
              icon="close"
              iconSize={26}
              hitSlop={12}
            />
          ) : (
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
          )}

          {isEditor ? (
            <SaveStatusText status={saveStatus} />
          ) : isSpaceSelecting ? (
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
                {selectedCount > 0 ? `${selectedCount} selected` : 'Select notes'}
              </Text>
            </View>
          ) : isDetail ? (
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
          {trailing}
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
              <NoteMenu note={note} getEditor={getEditor} onPinnedChange={onPinnedChange} />
            ) : null
          ) : isSettings || isDetail ? null : isSpaceSelecting ? (
            <ToolbarGroup accessibilityLabel="Selection actions">
              <ToolbarItem
                grouped
                hitSlop={4}
                icon={allSelected ? 'deselect' : 'select_all'}
                iconSize={26}
                accessibilityLabel={allSelected ? 'Deselect all' : 'Select all'}
                onPress={toggleSelectAll}
              />
              <ToolbarSeparator />
              <ToolbarMenu
                grouped
                accessibilityLabel="Bulk actions"
                actions={[
                  {
                    title: 'Delete',
                    icon: 'delete',
                    accessibilityLabel: 'Delete selected',
                    onPress: () => {
                      bulkDelete(selectedIds);
                    },
                  },
                  {
                    title: 'Move',
                    icon: 'drive_file_move',
                    accessibilityLabel: 'Move selected',
                    onPress: () => {
                      requestMove(selectedIds.map((id) => ({ path: id, title: id })));
                    },
                  },
                ]}
              />
            </ToolbarGroup>
          ) : (
            <ToolbarGroup accessibilityLabel="List actions">
              <ToolbarItem
                grouped
                hitSlop={4}
                icon="check_box"
                iconSize={26}
                accessibilityLabel="Select notes"
                onPress={() => enterSelection()}
              />
              <ToolbarSeparator />
              <ToolbarMenu grouped entries={spaceMenuEntries} accessibilityLabel="List actions" />
            </ToolbarGroup>
          )}
        </View>
      </View>
    </View>
  );
}
