import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { cssInterop } from 'nativewind';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, TextInput, View } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { MaterialSymbol } from '@/components/ui/MaterialSymbol';

import { FolderNameSheet, type FolderNameRequest } from '@/components/app/FolderNameSheet';
import { MoveSheet } from '@/components/app/MoveSheet';
import { NoteHoldPreview, type HoldAnchor } from '@/components/app/NoteHoldPreview';
import { SpaceBottomBar } from '@/components/app/SpaceBottomBar';
import { ListActionsProvider, type MoveTarget } from '@/lib/list-actions';
import { useListOptions, type ListSortOrder } from '@/lib/list-options';
import { prefetchNote, setCachedNote } from '@/lib/note-cache';
import {
  type Note,
  type WorkspaceFolder,
  type WorkspaceItem,
  type WorkspaceNoteItem,
} from '@/lib/paperite-data';
import { useSpace } from '@/lib/SpaceContext';
import { SpaceIcon } from '@/lib/space-icons';
import { useSelection } from '@/lib/selection';
import { useExpandedFolders } from '@/lib/use-expanded-folders';
import { useSpaceTree, useTrashNotes } from '@/lib/use-space-notes';
import { useColorScheme } from '@/lib/useColorScheme';
import {
  createFolder,
  deleteItemToTrash,
  deleteNoteToTrash,
  ensureStorageReady,
  moveItem,
  permanentDeleteTrashItem,
  readNoteById,
  renameItem,
  restoreTrashItem,
  setNotePinned,
  type TrashNote,
} from '@/lib/storage';
import { TRASH_ID } from '@/lib/storage/files';
import { withOpacity } from '@/theme/with-opacity';

/** Spacer bawah list: 112 (ruang FAB) + tinggi keyboard, animasi ikut keyboard. */
function ListKeyboardSpacer() {
  const { height } = useReanimatedKeyboardAnimation();
  const style = useAnimatedStyle(() => ({
    height: 112 + Math.abs(height.value),
  }));
  return <Animated.View style={style} />;
}

cssInterop(FlashList, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});

function NoteRow({
  note,
  breadcrumb,
  selecting,
  selected,
  showPreview = true,
  onPress,
  onPressIn,
  onLongPress,
}: {
  note: Note;
  breadcrumb?: string;
  selecting: boolean;
  selected: boolean;
  showPreview?: boolean;
  onPress: () => void;
  onPressIn: () => void;
  onLongPress: (anchor: HoldAnchor) => void;
}) {
  const { colors } = useColorScheme();
  const rowRef = useRef<View | null>(null);

  // judul kosong kesimpen jadi 'Untitled' di storage — tampilin grey
  // biar keliatan itu placeholder, bukan judul beneran.
  const isUntitled = !note.title?.trim() || note.title === 'Untitled';
  const hasPreview = showPreview && (note.preview ?? '').trim().length > 0;

  const fireLongPress = () => {
    const el = rowRef.current;
    if (!el) {
      onLongPress({ pageY: 300 });
      return;
    }
    try {
      // rect penuh biar preview bisa nempel persis di atas row ini
      el.measureInWindow((x, y, width) => onLongPress({ pageX: x, pageY: y, width }));
    } catch {
      onLongPress({ pageY: 300 });
    }
  };

  return (
    <View
      ref={rowRef}
      className="mx-2 mb-2 rounded-xl"
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: selected ? withOpacity(colors.primary, 0.12) : 'transparent',
      }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onLongPress={fireLongPress}
        delayLongPress={350}
        className="px-4 py-3 active:opacity-80"
        android_ripple={{
          color: withOpacity(colors.foreground, 0.14),
          borderless: false,
        }}
        // klik kanan (web/desktop) = hold juga
        {...(Platform.OS === 'web'
          ? {
              onContextMenu: (e: {
                preventDefault?: () => void;
                clientY?: number;
                clientX?: number;
              }) => {
                e?.preventDefault?.();
                onLongPress({ pageY: e?.clientY ?? 300, pageX: e?.clientX });
              },
            }
          : null)}
        style={({ pressed }) => [pressed && { opacity: 0.82 }]}>
        <View className="flex-row items-start gap-3">
          {selecting ? (
            <View style={{ paddingTop: 1 }}>
              <MaterialSymbol
                name={selected ? 'check_box' : 'check_box_outline_blank'}
                size={24}
                color={selected ? colors.primary : colors.mutedForeground}
              />
            </View>
          ) : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            {breadcrumb ? (
              <PaperText
                variant="labelSmall"
                style={{ color: colors.mutedForeground, marginBottom: 1 }}
                numberOfLines={1}>
                {breadcrumb}
              </PaperText>
            ) : null}
            <View className="mb-1 flex-row items-center gap-2">
              <PaperText
                variant="titleMedium"
                style={{
                  color: isUntitled ? colors.mutedForeground : colors.foreground,
                  fontSize: 18,
                  fontWeight: '600',
                  fontStyle: 'normal',
                  flex: 1,
                }}
                numberOfLines={1}>
                {isUntitled ? 'Untitled' : note.title}
              </PaperText>
              {/* 1:1 desktop: pin kecil di sebelah judul */}
              {note.pinned ? (
                <MaterialSymbol name="push_pin" size={18} color={colors.mutedForeground} />
              ) : null}
            </View>
            {hasPreview ? (
              <PaperText
                variant="bodyMedium"
                style={{ color: colors.mutedForeground }}
                numberOfLines={2}>
                {note.preview}
              </PaperText>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function FolderRow({
  title,
  count,
  depth,
  expanded,
  onPress,
  onLongPress,
}: {
  title: string;
  count: number;
  depth: number;
  expanded: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useColorScheme();
  return (
    <View className="mx-2 mb-1 rounded-xl" style={{ borderRadius: 14, overflow: 'hidden' }}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={400}
        className="active:opacity-80"
        android_ripple={{ color: withOpacity(colors.foreground, 0.14), borderless: false }}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 11,
            paddingRight: 12,
            paddingLeft: 12 + depth * 20,
          },
          pressed && { opacity: 0.82 },
        ]}>
        <MaterialSymbol
          name={expanded ? 'expand_more' : 'chevron_right'}
          size={22}
          color={colors.mutedForeground}
        />
        <SpaceIcon name="folder" size={22} color={colors.primary} />
        <PaperText
          variant="titleMedium"
          style={{ color: colors.foreground, fontSize: 17, fontWeight: '600', flex: 1 }}
          numberOfLines={1}>
          {title}
        </PaperText>
        <PaperText variant="labelMedium" style={{ color: colors.mutedForeground }}>
          {count}
        </PaperText>
      </Pressable>
    </View>
  );
}

type Row =
  | {
      kind: 'folder';
      key: string;
      path: string;
      title: string;
      depth: number;
      count: number;
      expanded: boolean;
    }
  | { kind: 'note'; key: string; note: Note; depth: number }
  | { kind: 'trash'; key: string; item: TrashNote };

function countNotes(items: WorkspaceItem[]): number {
  let n = 0;
  for (const item of items) {
    if (item.type === 'note') n += 1;
    else n += countNotes(item.children);
  }
  return n;
}

function flattenTree(items: WorkspaceItem[], expanded: Set<string>, depth: number, out: Row[]) {
  for (const item of items) {
    if (item.type === 'folder') {
      const isOpen = expanded.has(item.path);
      out.push({
        kind: 'folder',
        key: `f:${item.path}`,
        path: item.path,
        title: item.title,
        depth,
        count: countNotes(item.children),
        expanded: isOpen,
      });
      if (isOpen) flattenTree(item.children, expanded, depth + 1, out);
    } else {
      out.push({ kind: 'note', key: `n:${item.path}`, note: item.note, depth });
    }
  }
}

function collectNotes(items: WorkspaceItem[], out: Note[]) {
  for (const item of items) {
    if (item.type === 'note') out.push(item.note);
    else collectNotes(item.children, out);
  }
}

function treeHasFolders(items: WorkspaceItem[]): boolean {
  for (const item of items) {
    if (item.type === 'folder') return true;
  }
  return false;
}

// port sortWorkspaceItems desktop (app-sidebar.tsx) minus "custom" — mobile
// belum ada drag-reorder. pin selalu float ke atas dalam level-nya sendiri.
function titleForSort(item: WorkspaceItem): string {
  const title = item.type === 'folder' ? item.title : item.note.title;
  return title.trim() || 'Untitled';
}

function pinFirstItems(items: WorkspaceItem[]): WorkspaceItem[] {
  return [
    ...items.filter((i) => i.type === 'note' && i.note.pinned),
    ...items.filter((i) => !(i.type === 'note' && i.note.pinned)),
  ];
}

function sortWorkspaceItems(
  items: WorkspaceItem[],
  sortOrder: ListSortOrder,
  foldersFirst: boolean
): WorkspaceItem[] {
  const withSortedChildren = items.map((item) =>
    item.type === 'folder'
      ? { ...item, children: sortWorkspaceItems(item.children, sortOrder, foldersFirst) }
      : item
  );

  let sorted: WorkspaceItem[];
  if (sortOrder === 'a-z' || sortOrder === 'z-a') {
    sorted = [...withSortedChildren].sort((a, b) => {
      const comparison = titleForSort(a).localeCompare(titleForSort(b), undefined, {
        sensitivity: 'base',
        numeric: true,
      });
      return sortOrder === 'a-z' ? comparison : -comparison;
    });
  } else {
    const notes = withSortedChildren.filter(
      (item): item is WorkspaceNoteItem => item.type === 'note'
    );
    const sortedNotes = [...notes].sort((a, b) =>
      sortOrder === 'newest'
        ? b.note.updatedAt - a.note.updatedAt
        : a.note.updatedAt - b.note.updatedAt
    );
    let noteIndex = 0;
    sorted = withSortedChildren.map((item) =>
      item.type === 'note' ? sortedNotes[noteIndex++] : item
    );
  }

  const pinned = pinFirstItems(sorted);
  if (!foldersFirst) return pinned;
  return [
    ...pinned.filter((i): i is WorkspaceFolder => i.type === 'folder'),
    ...pinned.filter((i): i is WorkspaceNoteItem => i.type === 'note'),
  ];
}

/** flat notes (mode search): sort + pinFirst, folder ga ditampilin. */
function sortFlatNotes(notes: Note[], sortOrder: ListSortOrder): Note[] {
  const sorted = [...notes].sort((a, b) => {
    if (sortOrder === 'a-z' || sortOrder === 'z-a') {
      const comparison = (a.title.trim() || 'Untitled').localeCompare(
        b.title.trim() || 'Untitled',
        undefined,
        { sensitivity: 'base', numeric: true }
      );
      return sortOrder === 'a-z' ? comparison : -comparison;
    }
    return sortOrder === 'newest' ? b.updatedAt - a.updatedAt : a.updatedAt - b.updatedAt;
  });
  return [...sorted.filter((n) => n.pinned), ...sorted.filter((n) => !n.pinned)];
}

export default function NotesListScreen() {
  const { colors } = useColorScheme();
  const { activeSpaceId, activeSpace } = useSpace();
  const isTrash = activeSpaceId === TRASH_ID;
  const { tree, loading: treeLoading, reload: reloadTree } = useSpaceTree(activeSpaceId, !isTrash);
  const { items: trashItems, loading: trashLoading, reload: reloadTrash } = useTrashNotes(isTrash);
  const loading = isTrash ? trashLoading : treeLoading;
  const reload = isTrash ? reloadTrash : reloadTree;
  const space = activeSpace;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 70;
  const [search, setSearch] = useState('');
  const { selecting, enterSelection, toggleSelect, isSelected, setAllIds, exitSelection } =
    useSelection();
  const { expanded, toggle: toggleFolder, expand: expandFolder } = useExpandedFolders();
  const { sortOrder, foldersFirst, showPreview, setHasFolders } = useListOptions();

  const folderSheetRef = useRef<BottomSheetModal | null>(null);
  const moveSheetRef = useRef<BottomSheetModal | null>(null);
  const searchInputRef = useRef<TextInput | null>(null);
  // search yang lagi ke-focus harus di-blur eksplisit sebelum sheet
  // kebuka / pindah halaman — kalau engga, focus nyangkut + keyboard
  // nongol lagi sendiri pas sheet ketutup / balik ke list.
  const blurSearch = useCallback(() => {
    searchInputRef.current?.blur();
  }, []);
  const [folderRequest, setFolderRequest] = useState<FolderNameRequest | null>(null);
  const [moveTargets, setMoveTargets] = useState<MoveTarget[]>([]);
  // hold-preview ala instagram: note yang lagi di-hold + posisi row-nya
  const [heldNote, setHeldNote] = useState<Note | null>(null);
  const [holdAnchor, setHoldAnchor] = useState<HoldAnchor | null>(null);

  const allFlatNotes = useMemo(() => {
    const out: Note[] = [];
    collectNotes(tree, out);
    return out;
  }, [tree]);

  const idToPath = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of allFlatNotes) map.set(n.id, n.path);
    return map;
  }, [allFlatNotes]);

  const sortedTree = useMemo(
    () => sortWorkspaceItems(tree, sortOrder, foldersFirst),
    [tree, sortOrder, foldersFirst]
  );

  // header perlu tau ada folder apa engga biar toggle "folders first"
  // disembunyiin kalo ga relevan (mis. inbox yang ga bisa punya folder).
  useEffect(() => {
    setHasFolders(treeHasFolders(tree));
  }, [tree, setHasFolders]);

  const rows: Row[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (isTrash) {
      const filtered = q
        ? trashItems.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              t.preview.toLowerCase().includes(q) ||
              t.originalPath.toLowerCase().includes(q)
          )
        : trashItems;
      return filtered.map((item) => ({ kind: 'trash' as const, key: `t:${item.trashPath}`, item }));
    }
    if (q) {
      // mode search: flat, folder disembunyiin, breadcrumb nunjukin lokasi
      const hits = allFlatNotes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.preview.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.parentPath.toLowerCase().includes(q)
      );
      return sortFlatNotes(hits, sortOrder).map((note) => ({
        kind: 'note' as const,
        key: `n:${note.path}`,
        note,
        depth: 0,
      }));
    }
    const out: Row[] = [];
    flattenTree(sortedTree, expanded, 0, out);
    return out;
  }, [isTrash, trashItems, search, allFlatNotes, sortedTree, expanded, sortOrder]);

  const breadcrumbFor = useCallback(
    (note: Note): string | undefined => {
      if (note.parentPath === activeSpaceId) return undefined;
      const prefix = `${activeSpaceId}/`;
      const rel = note.parentPath.startsWith(prefix)
        ? note.parentPath.slice(prefix.length)
        : note.parentPath;
      return rel.split('/').join(' / ');
    },
    [activeSpaceId]
  );

  // inbox + spaces + trash: fab note. folder create cuma di user space
  const showFab = !isTrash;
  const showNewFolder = space?.kind === 'space';

  // daftarin id yang keliatan biar header bisa select-all
  useEffect(() => {
    setAllIds(rows.filter((r) => r.kind === 'note').map((r) => (r as { note: Note }).note.id));
  }, [rows, setAllIds]);

  // trash ga ada select mode — keluar otomatis kalau pindah ke trash
  useEffect(() => {
    if (isTrash && selecting) exitSelection();
  }, [isTrash, selecting, exitSelection]);

  // kunci drawer (swipe + tombol) selama select mode — cegah pindah space
  useEffect(() => {
    navigation.getParent()?.setOptions({ swipeEnabled: !selecting });
  }, [navigation, selecting]);

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({ swipeEnabled: !selecting });
      reload();
    }, [navigation, reload, selecting])
  );

  // lock biar double-tap / 2 jari ga numpuk 2 page di stack.
  const lastPushRef = useRef(0);

  const handleRowPress = useCallback(
    (note: Note) => {
      if (selecting) {
        toggleSelect(note.id);
        return;
      }
      const now = Date.now();
      if (now - lastPushRef.current < 600) return;
      lastPushRef.current = now;
      blurSearch();
      prefetchNote(note.id, note.spaceId);
      router.push({
        pathname: '/note/[id]',
        params: { id: note.id, title: note.title, spaceId: note.spaceId },
      });
    },
    [selecting, toggleSelect, blurSearch]
  );

  // jari nempel = file dibaca duluan, pas onPress push isinya udah di cache.
  const handleRowPressIn = useCallback((note: Note) => {
    prefetchNote(note.id, note.spaceId);
  }, []);

  const handleRowLongPress = useCallback(
    (note: Note, anchor: HoldAnchor) => {
      // lagi select mode: hold tetap toggle, jangan buka preview
      if (selecting) {
        toggleSelect(note.id);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      setHeldNote(note);
      setHoldAnchor(anchor);
    },
    [selecting, toggleSelect]
  );

  const handleTrashPress = useCallback(
    (item: TrashNote) => {
      Alert.alert(item.title || 'Untitled', `from: ${item.originalPath}`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              await ensureStorageReady();
              await restoreTrashItem(item.trashPath.split('/').pop() as string);
              reloadTrash();
            } catch {
              Alert.alert('Restore failed', 'Please try again.');
            }
          },
        },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await ensureStorageReady();
              await permanentDeleteTrashItem(item.trashPath.split('/').pop() as string);
              reloadTrash();
            } catch {
              Alert.alert('Delete failed', 'Please try again.');
            }
          },
        },
      ]);
    },
    [reloadTrash]
  );

  const requestCreateFolder = useCallback(
    (parentPath: string, parentTitle?: string) => {
      blurSearch();
      setFolderRequest({ mode: 'create', parentPath, parentTitle: parentTitle ?? parentPath });
      folderSheetRef.current?.present();
    },
    [blurSearch]
  );

  const requestRename = useCallback(
    (path: string, currentTitle: string) => {
      blurSearch();
      setFolderRequest({ mode: 'rename', path, currentTitle });
      folderSheetRef.current?.present();
    },
    [blurSearch]
  );

  const requestMove = useCallback(
    (targets: MoveTarget[]) => {
      if (targets.length === 0) return;
      blurSearch();
      setMoveTargets(targets);
      moveSheetRef.current?.present();
    },
    [blurSearch]
  );

  const handleFolderSubmit = useCallback(
    async (request: FolderNameRequest, name: string) => {
      try {
        await ensureStorageReady();
        if (request.mode === 'create') {
          const made = createFolder(request.parentPath, name);
          expandFolder(request.parentPath);
          expandFolder(made.path);
        } else {
          await renameItem(request.path, name);
        }
        reload();
      } catch (e) {
        Alert.alert('Failed', e instanceof Error ? e.message : 'Please try again.');
        throw e;
      }
    },
    [reload, expandFolder]
  );

  const handleMovePick = useCallback(
    async (targets: MoveTarget[], destParent: string) => {
      try {
        await ensureStorageReady();
        for (const t of targets) {
          await moveItem(t.path, destParent).catch(() => null);
        }
        expandFolder(destParent);
        exitSelection();
        reload();
      } catch {
        Alert.alert('Move failed', 'Please try again.');
        throw new Error('move failed');
      }
    },
    [reload, expandFolder, exitSelection]
  );

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      try {
        await ensureStorageReady();
        for (const id of ids) {
          await deleteNoteToTrash(id).catch(() => false);
        }
        exitSelection();
        reload();
      } catch {
        Alert.alert('Delete failed', 'Please try again.');
      }
    },
    [reload, exitSelection]
  );

  const dismissHold = useCallback(() => {
    setHeldNote(null);
    setHoldAnchor(null);
  }, []);

  const handleHoldOpen = useCallback(
    (note: Note) => {
      dismissHold();
      handleRowPress(note);
    },
    [dismissHold, handleRowPress]
  );

  const handleHoldSelect = useCallback(
    (note: Note) => {
      dismissHold();
      enterSelection(note.id);
    },
    [dismissHold, enterSelection]
  );

  const handleHoldMove = useCallback(
    (note: Note) => {
      dismissHold();
      requestMove([{ path: note.path, title: note.title || 'Untitled' }]);
    },
    [dismissHold, requestMove]
  );

  // 1:1 desktop pin toggle — setNotePinned ga bump updatedAt, reload cukup.
  const handleHoldPin = useCallback(
    async (note: Note) => {
      dismissHold();
      try {
        await ensureStorageReady();
        const updated = await setNotePinned(note.id, !note.pinned);
        if (updated) {
          const fresh = await readNoteById(note.id, note.spaceId).catch(() => null);
          if (fresh) setCachedNote(fresh);
        }
        reload();
      } catch {
        Alert.alert('Pin failed', 'Please try again.');
      }
    },
    [dismissHold, reload]
  );

  const handleHoldDelete = useCallback(
    (note: Note) => {
      dismissHold();
      Alert.alert('Delete note?', `"${note.title || 'Untitled'}" will be moved to Trash.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ensureStorageReady();
              await deleteNoteToTrash(note.id);
              reload();
            } catch {
              Alert.alert('Delete failed', 'Please try again.');
            }
          },
        },
      ]);
    },
    [dismissHold, reload]
  );

  const handleFolderPress = useCallback(
    (path: string) => {
      toggleFolder(path);
    },
    [toggleFolder]
  );

  const handleFolderLongPress = useCallback(
    (folderPath: string, title: string, noteCount: number) => {
      Alert.alert(title, noteCount === 0 ? 'Empty folder' : `${noteCount} notes inside`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New note here',
          onPress: () => {
            blurSearch();
            router.push({
              pathname: '/note/[id]',
              params: { id: 'new', spaceId: activeSpaceId, parentPath: folderPath },
            });
          },
        },
        {
          text: 'New subfolder',
          onPress: () => requestCreateFolder(folderPath, title),
        },
        {
          text: 'Rename',
          onPress: () => requestRename(folderPath, title),
        },
        {
          text: 'Move',
          onPress: () => requestMove([{ path: folderPath, title }]),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete folder?',
              `"${title}"${noteCount > 0 ? ` with ${noteCount} notes inside` : ''} will be moved to Trash.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await ensureStorageReady();
                      await deleteItemToTrash(folderPath);
                      reload();
                    } catch {
                      Alert.alert('Delete failed', 'Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]);
    },
    [activeSpaceId, requestCreateFolder, requestRename, requestMove, reload, blurSearch]
  );

  const listActions = useMemo(
    () => ({
      bulkDelete,
      requestMove: (targets: MoveTarget[]) => {
        // header kirim note id — petain ke path dulu
        const mapped = targets.map((t) => {
          const p = idToPath.get(t.path);
          return p ? { path: p, title: t.title } : t;
        });
        requestMove(mapped);
      },
      requestCreateFolder: (parentPath: string) =>
        requestCreateFolder(parentPath, activeSpace?.name ?? parentPath),
      requestRename,
    }),
    [bulkDelete, requestMove, requestCreateFolder, requestRename, idToPath, activeSpace]
  );

  return (
    <ListActionsProvider value={listActions}>
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        {loading && rows.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlashList
            data={rows}
            keyExtractor={(item) => item.key}
            estimatedItemSize={88}
            // Keep a generous native render buffer so fast flings don't expose blank rows.
            drawDistance={1600}
            contentContainerStyle={{
              paddingTop: headerHeight + 8,
              paddingBottom: 8,
              ...(rows.length === 0 ? { flexGrow: 1, paddingTop: 0 } : null),
            }}
            ListFooterComponent={rows.length === 0 ? null : <ListKeyboardSpacer />}
            renderItem={({ item }) => {
              if (item.kind === 'folder') {
                return (
                  <FolderRow
                    title={item.title}
                    count={item.count}
                    depth={item.depth}
                    expanded={item.expanded}
                    onPress={() => handleFolderPress(item.path)}
                    onLongPress={() => handleFolderLongPress(item.path, item.title, item.count)}
                  />
                );
              }
              if (item.kind === 'trash') {
                const note: Note = {
                  id: item.item.trashPath,
                  spaceId: TRASH_ID,
                  path: item.item.trashPath,
                  parentPath: TRASH_ID,
                  title: item.item.title,
                  preview: item.item.preview,
                  body: '',
                  updatedAt: item.item.deletedAt,
                  pinned: false,
                };
                return (
                  <NoteRow
                    note={note}
                    breadcrumb={item.item.originalPath}
                    selecting={false}
                    selected={false}
                    showPreview={showPreview}
                    onPress={() => handleTrashPress(item.item)}
                    onPressIn={() => undefined}
                    onLongPress={() => handleTrashPress(item.item)}
                  />
                );
              }
              return (
                <NoteRow
                  note={item.note}
                  breadcrumb={
                    search.trim()
                      ? breadcrumbFor(item.note)
                      : item.depth > 0
                        ? breadcrumbFor(item.note)
                        : undefined
                  }
                  selecting={selecting}
                  selected={isSelected(item.note.id)}
                  showPreview={showPreview}
                  onPress={() => handleRowPress(item.note)}
                  onPressIn={() => handleRowPressIn(item.note)}
                  onLongPress={(anchor) => handleRowLongPress(item.note, anchor)}
                />
              );
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center gap-2 px-8">
                <MaterialSymbol
                  name={search.trim() ? 'search_off' : isTrash ? 'delete' : 'note_add'}
                  size={46}
                  color={colors.mutedForeground}
                />
                <PaperText variant="titleMedium" style={{ color: colors.foreground }}>
                  {search.trim() ? 'No results' : isTrash ? 'Trash is empty' : 'no notes yet'}
                </PaperText>
                <PaperText
                  variant="bodyMedium"
                  style={{ color: colors.mutedForeground, textAlign: 'center' }}>
                  {search.trim()
                    ? `No notes matching "${search.trim()}"`
                    : isTrash
                      ? 'Deleted notes stay here for 30 days.'
                      : 'This space is empty. Tap + to create a new note.'}
                </PaperText>
              </View>
            }
          />
        )}

        <SpaceBottomBar
          search={search}
          onSearchChange={setSearch}
          searchInputRef={searchInputRef}
          showAdd={showFab}
          showNewFolder={showNewFolder}
          onNewFolder={() => requestCreateFolder(activeSpaceId, activeSpace?.name ?? activeSpaceId)}
        />

        <FolderNameSheet
          sheetRef={folderSheetRef}
          request={folderRequest}
          onSubmit={handleFolderSubmit}
        />
        <MoveSheet
          sheetRef={moveSheetRef}
          spaceId={activeSpaceId}
          spaceName={activeSpace?.name ?? activeSpaceId}
          targets={moveTargets}
          onPick={handleMovePick}
        />
        <NoteHoldPreview
          note={heldNote}
          anchor={holdAnchor}
          breadcrumb={heldNote ? breadcrumbFor(heldNote) : undefined}
          showPreview={showPreview}
          onDismiss={dismissHold}
          onOpen={handleHoldOpen}
          onSelect={handleHoldSelect}
          onMove={handleHoldMove}
          onPin={handleHoldPin}
          onDelete={handleHoldDelete}
        />
      </View>
    </ListActionsProvider>
  );
}
