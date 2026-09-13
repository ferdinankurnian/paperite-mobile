// sheet input nama folder — dipake buat create + rename.
// beda sama CreateSpaceSheet: kompak (tanpa icon/color, folder ga punya itu).

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as React from 'react';
import { View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToolbarItem } from '@/components/ui/Toolbar';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

export type FolderNameRequest =
  | { mode: 'create'; parentPath: string; parentTitle: string }
  | { mode: 'rename'; path: string; currentTitle: string };

type Props = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  request: FolderNameRequest | null;
  onSubmit: (request: FolderNameRequest, name: string) => Promise<void>;
};

function SheetBackdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />;
}

export function FolderNameSheet({ sheetRef, request, onSubmit }: Props) {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  // ref gesture-handler TextInput (bukan RN TextInput) — simpen minimal biar bisa .focus()
  const inputRef = React.useRef<{ focus: () => void } | null>(null);
  const handleInputRef = React.useCallback((el: { focus: () => void } | null | undefined) => {
    inputRef.current = el ?? null;
  }, []);
  const snapPoints = React.useMemo(() => ['40%'], []);

  // request ganti (create di parent X / rename Y) → reset input.
  // sinkronisasi props-ke-state yang valid (kasus "reset form"), mirip
  // pola reload() di use-space-notes — rule-nya false positive di sini.
  React.useEffect(() => {
    if (request) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(request.mode === 'rename' ? request.currentTitle : '');
      setBusy(false);
    }
  }, [request]);

  const title = request?.mode === 'rename' ? 'Rename folder' : 'New folder';
  const subtitle =
    request?.mode === 'rename' ? request.path : request ? `di ${request.parentTitle}` : '';
  const canSave = name.trim().length > 0 && !busy;

  const handleSheetChange = React.useCallback(() => {
    // fokus belakangan (bukan autoFocus): keyboard yang kebuka bareng
    // animasi present bikin gorhom gagal ngukur → sheet ketiban keyboard.
    setTimeout(() => inputRef.current?.focus(), 250);
  }, []);

  const handleSave = React.useCallback(async () => {
    if (!request || !name.trim() || busy) return;
    setBusy(true);
    try {
      await onSubmit(request, name.trim());
      sheetRef.current?.dismiss();
    } catch {
      // screen yang alert; sheet sengaja tetap kebuka biar bisa koreksi nama
    } finally {
      setBusy(false);
    }
  }, [request, name, busy, onSubmit, sheetRef]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={SheetBackdrop}
      handleComponent={null}
      onChange={handleSheetChange}
      backgroundStyle={{ backgroundColor: colors.card }}
      style={{ overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 20,
          gap: 12,
        }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ToolbarItem
            icon="close"
            accessibilityLabel="Close"
            onPress={() => sheetRef.current?.dismiss()}
          />
          <PaperText variant="titleMedium" style={{ color: colors.foreground, fontWeight: '700' }}>
            {title}
          </PaperText>
          <ToolbarItem
            icon="check"
            accessibilityLabel="Save"
            onPress={handleSave}
            disabled={!canSave}
          />
        </View>
        {subtitle ? (
          <PaperText
            variant="bodySmall"
            style={{ color: colors.mutedForeground, textAlign: 'center' }}
            numberOfLines={1}>
            {subtitle}
          </PaperText>
        ) : null}
        <View
          style={{
            backgroundColor: withOpacity(colors.foreground, 0.06),
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
          }}>
          <BottomSheetTextInput
            ref={handleInputRef}
            value={name}
            onChangeText={setName}
            placeholder={request?.mode === 'rename' ? 'Folder name' : 'Untitled'}
            placeholderTextColor={colors.mutedForeground}
            style={{ color: colors.foreground, fontSize: 17, height: 50 }}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>
      </View>
    </BottomSheetModal>
  );
}
