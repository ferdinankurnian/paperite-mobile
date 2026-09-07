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

type Props = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onCreated?: () => void;
};

function SymbolIcon({ name, size, color }: { name: string; size: number; color: string }) {
  return (
    <Text
      style={{
        fontFamily: 'MaterialSymbols_400Regular',
        fontSize: size,
        lineHeight: size,
        color,
        includeFontPadding: false,
      }}>
      {name}
    </Text>
  );
}

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
  const snapPoints = React.useMemo(() => ['82%', '95%'], []);

  // 14 warna desktop → 7 kolom x 2 baris, fix
  const colorRows = React.useMemo(() => {
    const rows: string[][] = [];
    for (let i = 0; i < SPACE_COLORS.length; i += 7) {
      rows.push([...SPACE_COLORS].slice(i, i + 7));
    }
    return rows;
  }, []);

  const canCreate = name.trim().length > 0;

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

  // footer bawaan gorhom → absolute nempel bawah, ga keikut scroll
  const renderFooter = React.useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={insets.bottom}>
        <View
          style={{
            backgroundColor: colors.card,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 8,
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
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={SheetBackdrop}
      footerComponent={renderFooter}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground, width: 40 }}
      backgroundStyle={{ backgroundColor: colors.card }}
      style={{ overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
      <BottomSheetScrollView
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled">
        {/* sticky top: preview + name + segmented */}
        <View
          style={{
            backgroundColor: colors.card,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 12,
          }}>
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: withOpacity(colors.foreground, 0.08),
              }}>
              <SymbolIcon name={icon} size={38} color={color} />
            </View>
          </View>

          <View
            style={{
              backgroundColor: withOpacity(colors.foreground, 0.06),
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              marginTop: 12,
            }}>
            <BottomSheetTextInput
              value={name}
              onChangeText={setName}
              placeholder="HOMESICK"
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
              marginTop: 12,
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

        {/* scroll content */}
        <View style={{ paddingHorizontal: 20, paddingTop: 2, gap: 14 }}>
          {tab === 'icons' ? (
            <>
              <View style={{ gap: 10 }}>
                <PaperText variant="labelLarge" style={{ color: colors.mutedForeground }}>
                  Color
                </PaperText>
                <View style={{ gap: 10 }}>
                  {colorRows.map((row, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      {row.map((c) => {
                        const active = color === c;
                        return (
                          <Pressable
                            key={c}
                            onPress={() => setColor(c)}
                            accessibilityLabel={`Use ${c}`}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: c,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: active ? 2 : 0,
                              borderColor: active ? colors.foreground : 'transparent',
                            }}>
                            {active ? (
                              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                                ✓
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {SPACE_SYMBOLS.map((sym) => {
                  const active = icon === sym;
                  return (
                    <Pressable
                      key={sym}
                      onPress={() => setIcon(sym)}
                      style={{
                        width: '15%',
                        aspectRatio: 1,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active
                          ? withOpacity(color, 0.18)
                          : withOpacity(colors.foreground, 0.04),
                      }}>
                      <SymbolIcon name={sym} size={24} color={active ? color : colors.foreground} />
                    </Pressable>
                  );
                })}
              </View>
            </>
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
              <SymbolIcon name="upload" size={28} color={colors.mutedForeground} />
              <PaperText variant="bodyMedium" style={{ color: colors.mutedForeground }}>
                custom icon upload nyusul
              </PaperText>
            </View>
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
