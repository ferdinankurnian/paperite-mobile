// sheet pilih tujuan pindahan (space root + semua folder).
// target + keturunannya di-exclude biar ga bisa pindah ke diri sendiri
// (mirror desktop 400 "cannot move an item into itself").

import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MoveTarget } from '@/lib/list-actions';
import { SpaceIcon } from '@/lib/space-icons';
import { ensureStorageReady, listSpaceTree } from '@/lib/storage';
import { isDescendantPath } from '@/lib/storage/files';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

type Destination = {
  path: string;
  title: string;
  depth: number;
};

type Props = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  spaceId: string;
  spaceName: string;
  targets: MoveTarget[];
  onPick: (targets: MoveTarget[], destParent: string) => Promise<void>;
};

function SheetBackdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />;
}

function flattenFolders(
  items: Awaited<ReturnType<typeof listSpaceTree>>,
  depth: number,
  out: Destination[]
) {
  for (const item of items) {
    if (item.type !== 'folder') continue;
    out.push({ path: item.path, title: item.title, depth });
    flattenFolders(item.children, depth + 1, out);
  }
}

export function MoveSheet({ sheetRef, spaceId, spaceName, targets, onPick }: Props) {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const [destinations, setDestinations] = React.useState<Destination[]>([]);
  const [busy, setBusy] = React.useState(false);
  const snapPoints = React.useMemo(() => ['60%'], []);

  const excluded = React.useMemo(() => targets.map((t) => t.path), [targets]);

  const load = React.useCallback(async () => {
    try {
      await ensureStorageReady();
      const tree = await listSpaceTree(spaceId);
      const folders: Destination[] = [];
      flattenFolders(tree, 1, folders);
      const visible = folders.filter(
        (f) => !excluded.some((ex) => ex === f.path || isDescendantPath(ex, f.path))
      );
      setDestinations([{ path: spaceId, title: spaceName, depth: 0 }, ...visible]);
    } catch {
      setDestinations([{ path: spaceId, title: spaceName, depth: 0 }]);
    }
  }, [spaceId, spaceName, excluded]);

  const handleSheetChange = React.useCallback(
    (index: number) => {
      if (index >= 0) {
        setBusy(false);
        load();
      }
    },
    [load]
  );

  const handlePick = React.useCallback(
    async (dest: Destination) => {
      if (busy) return;
      setBusy(true);
      try {
        await onPick(targets, dest.path);
        sheetRef.current?.dismiss();
      } catch {
        // screen yang alert; sheet tetap kebuka biar bisa pilih lain
      } finally {
        setBusy(false);
      }
    },
    [busy, onPick, targets, sheetRef]
  );

  const summary =
    targets.length === 0
      ? 'Move'
      : targets.length === 1
        ? `Move "${targets[0].title}"`
        : `Move ${targets.length} items`;

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={SheetBackdrop}
      handleComponent={null}
      onChange={handleSheetChange}
      backgroundStyle={{ backgroundColor: colors.card }}
      style={{ overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <PaperText
          variant="titleMedium"
          style={{ color: colors.foreground, fontWeight: '700', textAlign: 'center' }}
          numberOfLines={1}>
          {summary}
        </PaperText>
        <PaperText
          variant="bodySmall"
          style={{ color: colors.mutedForeground, textAlign: 'center' }}>
          Choose a destination
        </PaperText>
      </View>
      <BottomSheetFlatList
        data={destinations}
        keyExtractor={(item) => item.path}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 20 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handlePick(item)}
            android_ripple={{ color: withOpacity(colors.foreground, 0.14) }}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 12,
              },
              pressed && { opacity: 0.8 },
            ]}>
            <View style={{ width: 16 + item.depth * 18 }} />
            <SpaceIcon
              name={item.depth === 0 ? 'inbox' : 'folder'}
              size={22}
              color={item.depth === 0 ? colors.primary : colors.mutedForeground}
            />
            <PaperText
              variant="bodyLarge"
              style={{ color: colors.foreground, flex: 1 }}
              numberOfLines={1}>
              {item.depth === 0 ? `${item.title} (root)` : item.title}
            </PaperText>
          </Pressable>
        )}
      />
    </BottomSheetModal>
  );
}
