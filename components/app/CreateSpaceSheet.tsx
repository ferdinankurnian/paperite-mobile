import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACE_COLORS, SPACE_SYMBOLS } from '@/lib/space-options';
import { useSpace } from '@/lib/SpaceContext';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';
import { MaterialSymbol } from '@/components/ui/MaterialSymbol';
import { ToolbarItem } from '@/components/ui/Toolbar';

type Props = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onCreated?: () => void;
};

// memo: ketik nama / ganti tab ga ikut re-render 42 cell
const SymbolCell = React.memo(function SymbolCell({
  name,
  selected,
  selectedColor,
  normalColor,
  onSelect,
}: {
  name: string;
  selected: boolean;
  selectedColor: string;
  normalColor: string;
  onSelect: (name: string) => void;
}) {
  return (
    <View style={{ width: '16.66%', aspectRatio: 1, padding: 3 }}>
      <Pressable
        onPress={() => onSelect(name)}
        style={{
          flex: 1,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? withOpacity(selectedColor, 0.18) : 'transparent',
        }}>
        <MaterialSymbol name={name} size={28} color={selected ? selectedColor : normalColor} />
      </Pressable>
    </View>
  );
});

const ColorDot = React.memo(function ColorDot({
  value,
  selected,
  ringColor,
  onSelect,
}: {
  value: string;
  selected: boolean;
  ringColor: string;
  onSelect: (color: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onSelect(value)}
      accessibilityLabel={`Use ${value}`}
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: value,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: selected ? 2 : 0,
        borderColor: selected ? ringColor : 'transparent',
      }}>
      {selected ? (
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>
      ) : null}
    </Pressable>
  );
});

function SheetBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
  );
}

export function CreateSpaceSheet({ sheetRef, onCreated }: Props) {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { addSpace } = useSpace();
  const [name, setName] = React.useState('');
  const [icon, setIcon] = React.useState<string>('folder');
  const [color, setColor] = React.useState<string>(SPACE_COLORS[0]);
  const [tab, setTab] = React.useState<'icons' | 'upload'>('icons');
  // grid berat → mount belakangan biar animasi slide-up ga kecekek
  const [gridReady, setGridReady] = React.useState(false);
  const snapPoints = React.useMemo(() => ['94%'], []);

  // 14 warna desktop → 7 kolom x 2 baris, fix
  const colorRows = React.useMemo(() => {
    const rows: string[][] = [];
    for (let i = 0; i < SPACE_COLORS.length; i += 7) {
      rows.push([...SPACE_COLORS].slice(i, i + 7));
    }
    return rows;
  }, []);

  const canCreate = name.trim().length > 0;

  const handleSelectIcon = React.useCallback((next: string) => setIcon(next), []);
  const handleSelectColor = React.useCallback((next: string) => setColor(next), []);

  const handleCreate = React.useCallback(() => {
    if (!name.trim()) return;
    addSpace(name, icon, color);
    setName('');
    setIcon('folder');
    setColor(SPACE_COLORS[0]);
    setTab('icons');
    sheetRef.current?.dismiss();
    onCreated?.();
  }, [name, icon, color, addSpace, sheetRef, onCreated]);

  const handleClose = React.useCallback(() => {
    sheetRef.current?.dismiss();
  }, [sheetRef]);

  const handleSheetChange = React.useCallback((index: number) => {
    if (index >= 0) setGridReady(true);
  }, []);

  // footer bawaan gorhom → absolute nempel bawah, ga keikut scroll
  const renderFooter = React.useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
          }}>
          <Pressable
            onPress={handleCreate}
            disabled={!canCreate}
            style={{
              height: 48,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: canCreate ? colors.primary : withOpacity(colors.foreground, 0.1),
            }}>
            <PaperText
              variant="titleMedium"
              style={{
                color: canCreate ? colors.primaryForeground : colors.mutedForeground,
                fontWeight: '700',
              }}>
              Save
            </PaperText>
          </Pressable>
        </View>
      </BottomSheetFooter>
    ),
    [colors, insets.bottom, canCreate, handleCreate]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="none"
      android_keyboardInputMode="adjustResize"
      backdropComponent={SheetBackdrop}
      footerComponent={renderFooter}
      handleComponent={null}
      onChange={handleSheetChange}
      backgroundStyle={{ backgroundColor: colors.card }}
      style={{ overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
      <BottomSheetScrollView
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        keyboardShouldPersistTaps="handled">
        {/* sticky top: toolbar + preview + name + segmented */}
        <View
          style={{
            backgroundColor: colors.card,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 16,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
            <ToolbarItem
              icon="close"
              accessibilityLabel="Close"
              onPress={handleClose}
            />
            <ToolbarItem
              icon="check"
              accessibilityLabel="Done"
              onPress={handleCreate}
              disabled={!canCreate}
            />
          </View>
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <View
              style={{
                width: 96,
                height: 96,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialSymbol name={icon} size={64} color={color} />
            </View>
          </View>

          <View
            style={{
              backgroundColor: withOpacity(colors.foreground, 0.06),
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              marginTop: 16,
            }}>
            <BottomSheetTextInput
              value={name}
              onChangeText={setName}
              placeholder="New Space"
              placeholderTextColor={colors.mutedForeground}
              style={{ color: colors.foreground, fontSize: 17, height: 50, textAlign: 'center' }}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              backgroundColor: withOpacity(colors.foreground, 0.08),
              borderRadius: 12,
              padding: 3,
              marginTop: 16,
            }}>
            {(['icons', 'upload'] as const).map((t) => {
              const active = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? colors.card : 'transparent',
                  }}>
                  <PaperText
                    variant="labelLarge"
                    style={{ color: active ? colors.foreground : colors.mutedForeground }}>
                    {t === 'icons' ? 'Icons' : 'Upload'}
                  </PaperText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* scroll content — grid dimount belakangan biar open-nya enteng */}
        <View style={{ paddingHorizontal: 20, paddingTop: 2, gap: 14 }}>
          {tab === 'icons' ? (
            gridReady ? (
              <>
                <View style={{ gap: 10 }}>
                  <PaperText variant="labelLarge" style={{ color: colors.mutedForeground }}>
                    Color
                  </PaperText>
                  <View style={{ gap: 10 }}>
                    {colorRows.map((row, i) => (
                      <View
                        key={i}
                        style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        {row.map((c) => (
                          <ColorDot
                            key={c}
                            value={c}
                            selected={color === c}
                            ringColor={colors.foreground}
                            onSelect={handleSelectColor}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {SPACE_SYMBOLS.map((sym) => (
                    <SymbolCell
                      key={sym}
                      name={sym}
                      selected={icon === sym}
                      selectedColor={color}
                      normalColor={colors.foreground}
                      onSelect={handleSelectIcon}
                    />
                  ))}
                </View>
              </>
            ) : null
          ) : (
            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
                padding: 24,
                alignItems: 'center',
                gap: 6,
              }}>
              <MaterialSymbol name="upload" size={28} color={colors.mutedForeground} />
              <PaperText variant="bodyMedium" style={{ color: colors.mutedForeground }}>
                Custom icon upload coming soon
              </PaperText>
            </View>
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
