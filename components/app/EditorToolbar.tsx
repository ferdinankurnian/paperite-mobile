import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronsUpDown,
  Code,
  Highlighter,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type EditorActiveState, type MobileEditor } from '@/lib/editor/types';

import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

const TEXT_COLORS = [
  '#000000',
  '#ff6b6b',
  '#ff9f43',
  '#ffd43b',
  '#69db7c',
  '#38d9a9',
  '#4dabf7',
  '#b197fc',
  '#f783ac',
  '#e599f7',
];

const HIGHLIGHT_COLORS = [
  '#fde047',
  '#fb923c',
  '#fb7185',
  '#86efac',
  '#5eead4',
  '#93c5fd',
  '#c4b5fd',
  '#f0abfc',
];

const BLOCK_OPTIONS = [
  { level: 0, label: 'Body' },
  { level: 1, label: 'Heading 1' },
  { level: 2, label: 'Heading 2' },
  { level: 3, label: 'Heading 3' },
] as const;

const ALIGN_OPTIONS = [
  { key: 'left', icon: AlignLeft },
  { key: 'center', icon: AlignCenter },
  { key: 'right', icon: AlignRight },
  { key: 'justify', icon: AlignJustify },
] as const;

/** fade di atas bar biar teks yang kescroll ke belakang toolbar lumer,
 *  bukan kepotong kotak keras. teknik sama kayak AppHeader (Svg, bukan
 *  expo-linear-gradient biar ga nambah dep). */
const FADE_H = 40;

function BarButton({
  icon,
  iconSize = 22,
  label,
  active,
  onPress,
  accessibilityLabel,
  activeColor,
  dimmed,
  children,
}: {
  icon?: LucideIcon;
  iconSize?: number;
  label?: string;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  activeColor: string;
  dimmed?: boolean;
  children?: ReactNode;
}) {
  const { colors } = useColorScheme();
  const Icon = icon;
  const tint = dimmed ? colors.mutedForeground : active ? activeColor : colors.foreground;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: withOpacity(colors.foreground, 0.14), borderless: false }}
      style={({ pressed }) => [
        {
          minWidth: 44,
          height: 44,
          borderRadius: 13,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: label ? 10 : 0,
          gap: 2,
          backgroundColor: active
            ? withOpacity(colors.primary, 0.14)
            : pressed
              ? withOpacity(colors.foreground, 0.08)
              : 'transparent',
          opacity: dimmed ? 0.45 : 1,
        },
      ]}>
      {children ?? (
        <>
          {Icon ? <Icon size={iconSize} color={tint} /> : null}
          {label ? <Text style={{ color: tint, fontSize: 15 }}>{label}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

function Divider() {
  const { colors } = useColorScheme();
  return (
    <View
      style={{
        width: 1,
        height: 24,
        alignSelf: 'center',
        marginHorizontal: 4,
        backgroundColor: withOpacity(colors.border, 0.9),
      }}
    />
  );
}

function Sheet({
  visible,
  title,
  colors: swatches,
  activeColor,
  onPick,
  onClear,
  onClose,
}: {
  visible: boolean;
  title: string;
  colors: string[];
  activeColor?: string | null;
  onPick: (c: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { colors } = useColorScheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)' }}
        onPress={onClose}>
        <View
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: withOpacity(colors.border, 0.9),
            paddingHorizontal: 16,
            paddingBottom: 40,
            paddingTop: 12,
          }}>
          <View
            style={{
              marginBottom: 12,
              height: 4,
              width: 40,
              alignSelf: 'center',
              borderRadius: 2,
              backgroundColor: colors.border,
            }}
          />
          <Text
            style={{
              marginBottom: 12,
              fontSize: 16,
              fontWeight: '600',
              color: colors.foreground,
            }}>
            {title}
          </Text>
          <View style={{ marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {swatches.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  onPick(c);
                  onClose();
                }}
                accessibilityLabel={`Apply ${c}`}
                style={{
                  height: 36,
                  width: 36,
                  borderRadius: 18,
                  backgroundColor: c,
                  borderWidth: activeColor === c ? 2 : 1,
                  borderColor: activeColor === c ? colors.foreground : colors.border,
                }}
              />
            ))}
          </View>
          <Pressable
            onPress={() => {
              onClear();
              onClose();
            }}
            accessibilityLabel="Remove formatting"
            android_ripple={{ color: withOpacity(colors.foreground, 0.14) }}
            style={{
              alignItems: 'center',
              borderRadius: 14,
              backgroundColor: colors.muted,
              paddingVertical: 12,
            }}>
            <Text style={{ fontSize: 15, color: colors.mutedForeground }}>Unset</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

/**
 * copy model floating paperite-rn (FormatToolbar): bar full-bleed nempel
 * tepi bawah (bukan pill), gradient fade di atasnya, satu scroll horizontal:
 * style dropdown, B I U S, highlight, text color, quote, code, link, align,
 * bullet, ordered, task, undo, redo.
 *
 * artstyle tetap paperite-mobile: bar hitam (colors.background), tombol 44
 * radius 13, active = tint primary.
 *
 * yang sengaja beda dari rn:
 * - image nggak ada — butuh expo-image-picker + permission (dev build).
 *   command `setImage` udah siap, tinggal source-nya (TODO(mobile-image)).
 * - gradient fade pakai react-native-svg (kayak AppHeader), bukan
 *   expo-linear-gradient — hasilnya sama, tanpa dep baru.
 */
export function EditorToolbar({
  editor,
  editorState: state,
}: {
  editor: MobileEditor;
  editorState: EditorActiveState;
}) {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 4);
  const [fadeWidth, setFadeWidth] = useState(0);
  const [blockOpen, setBlockOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');

  const onFadeLayout = (e: LayoutChangeEvent) => {
    setFadeWidth(e.nativeEvent.layout.width);
  };

  const blockLabel = BLOCK_OPTIONS.find((o) => o.level === state.headingLevel)?.label ?? 'Body';

  const applyBlock = (level: 0 | 1 | 2 | 3) => {
    if (level === 0) editor.clearHeading();
    else editor.toggleHeading(level);
    setBlockOpen(false);
  };

  const textColor = state.activeColor ?? colors.foreground;

  return (
    <View onLayout={onFadeLayout} style={{ position: 'relative' }}>
      {fadeWidth > 0 ? (
        <Svg
          pointerEvents="none"
          width={fadeWidth}
          height={FADE_H}
          style={{ position: 'absolute', left: 0, right: 0, top: -FADE_H }}>
          <Defs>
            <LinearGradient id="toolbarFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.background} stopOpacity="0" />
              <Stop offset="0.6" stopColor={colors.background} stopOpacity="0.85" />
              <Stop offset="1" stopColor={colors.background} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={fadeWidth} height={FADE_H} fill="url(#toolbarFade)" />
        </Svg>
      ) : null}

      <View style={{ backgroundColor: colors.background }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 8 + bottomInset,
            alignItems: 'center',
            gap: 2,
          }}>
          <Pressable
            onPress={() => setBlockOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel="Text style"
            android_ripple={{ color: withOpacity(colors.foreground, 0.14), borderless: false }}
            style={({ pressed }) => [
              {
                marginRight: 4,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderRadius: 13,
                borderWidth: 1,
                borderColor: withOpacity(colors.border, 0.9),
                backgroundColor: colors.muted,
                paddingHorizontal: 12,
                height: 44,
                opacity: pressed && !blockOpen ? 0.7 : 1,
              },
            ]}>
            <Text style={{ color: colors.foreground, fontSize: 17 }}>{blockLabel}</Text>
            <ChevronsUpDown size={18} color={colors.mutedForeground} strokeWidth={1.5} />
          </Pressable>

          <BarButton
            icon={Bold}
            active={state.isBoldActive}
            onPress={() => editor.toggleBold()}
            accessibilityLabel="Bold"
            activeColor={colors.primary}
          />
          <BarButton
            icon={Italic}
            active={state.isItalicActive}
            onPress={() => editor.toggleItalic()}
            accessibilityLabel="Italic"
            activeColor={colors.primary}
          />
          <BarButton
            icon={Underline}
            active={state.isUnderlineActive}
            onPress={() => editor.toggleUnderline()}
            accessibilityLabel="Underline"
            activeColor={colors.primary}
          />
          <BarButton
            icon={Strikethrough}
            active={state.isStrikeActive}
            onPress={() => editor.toggleStrike()}
            accessibilityLabel="Strikethrough"
            activeColor={colors.primary}
          />
          <Divider />
          <BarButton
            icon={Highlighter}
            active={!!state.activeHighlight}
            onPress={() => setHighlightOpen(true)}
            accessibilityLabel="Highlight"
            activeColor={state.activeHighlight ?? colors.primary}
          />
          <BarButton
            onPress={() => setColorOpen(true)}
            active={!!state.activeColor}
            accessibilityLabel="Text color"
            activeColor={colors.primary}>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: textColor }}>A</Text>
              <View
                style={{
                  marginTop: 2,
                  height: 2,
                  width: 16,
                  borderRadius: 1,
                  backgroundColor: textColor,
                }}
              />
            </View>
          </BarButton>
          <Divider />
          <BarButton
            icon={Quote}
            active={state.isBlockquoteActive}
            onPress={() => editor.toggleBlockquote()}
            accessibilityLabel="Quote"
            activeColor={colors.primary}
          />
          <BarButton
            icon={Code}
            active={state.isCodeActive}
            onPress={() => editor.toggleCode()}
            accessibilityLabel="Code"
            activeColor={colors.primary}
          />
          <BarButton
            icon={Link}
            active={state.isLinkActive}
            onPress={() => {
              setLinkValue(state.activeLink ?? '');
              setLinkOpen(true);
            }}
            accessibilityLabel="Link"
            activeColor={colors.primary}
          />
          <Divider />
          {ALIGN_OPTIONS.map(({ key, icon }) => (
            <BarButton
              key={key}
              icon={icon}
              iconSize={21}
              active={state.textAlign === key}
              onPress={() => editor.setTextAlign(key)}
              accessibilityLabel={`Align ${key}`}
              activeColor={colors.primary}
            />
          ))}
          <Divider />
          <BarButton
            icon={List}
            active={state.isBulletListActive}
            onPress={() => editor.toggleBulletList()}
            accessibilityLabel="Bullet list"
            activeColor={colors.primary}
          />
          <BarButton
            icon={ListOrdered}
            active={state.isOrderedListActive}
            onPress={() => editor.toggleOrderedList()}
            accessibilityLabel="Numbered list"
            activeColor={colors.primary}
          />
          <BarButton
            icon={ListChecks}
            active={state.isTaskListActive}
            onPress={() => editor.toggleTaskList()}
            accessibilityLabel="Task list"
            activeColor={colors.primary}
          />
          <Divider />
          <BarButton
            icon={Undo2}
            iconSize={21}
            dimmed={!state.canUndo}
            onPress={() => editor.undo()}
            accessibilityLabel="Undo"
            activeColor={colors.primary}
          />
          <BarButton
            icon={Redo2}
            iconSize={21}
            dimmed={!state.canRedo}
            onPress={() => editor.redo()}
            accessibilityLabel="Redo"
            activeColor={colors.primary}
          />
        </ScrollView>
      </View>

      {blockOpen ? (
        <View
          style={{
            position: 'absolute',
            left: 16,
            bottom: 64 + bottomInset,
            width: 220,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: withOpacity(colors.border, 0.9),
            backgroundColor: colors.card,
            paddingHorizontal: 8,
            paddingVertical: 8,
            elevation: 8,
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            shadowColor: '#000',
            zIndex: 20,
          }}>
          {BLOCK_OPTIONS.map((opt) => {
            const selected = state.headingLevel === opt.level;
            return (
              <Pressable
                key={opt.label}
                onPress={() => applyBlock(opt.level)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                android_ripple={{ color: withOpacity(colors.foreground, 0.14) }}
                style={{
                  marginBottom: 2,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: selected ? withOpacity(colors.foreground, 0.08) : 'transparent',
                }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: opt.level === 0 ? 15 : 24 - opt.level * 2,
                    fontWeight: opt.level === 0 ? '400' : '700',
                  }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Sheet
        visible={highlightOpen}
        title="Highlight"
        colors={HIGHLIGHT_COLORS}
        activeColor={state.activeHighlight}
        onPick={(c) => editor.toggleHighlight(c)}
        onClear={() => editor.unsetHighlight()}
        onClose={() => setHighlightOpen(false)}
      />

      <Sheet
        visible={colorOpen}
        title="Text color"
        colors={TEXT_COLORS}
        activeColor={state.activeColor}
        onPick={(c) => editor.setColor(c)}
        onClear={() => editor.unsetColor()}
        onClose={() => setColorOpen(false)}
      />

      <Modal
        visible={linkOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLinkOpen(false)}>
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)' }}
          onPress={() => setLinkOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: withOpacity(colors.border, 0.9),
              paddingHorizontal: 16,
              paddingBottom: 40,
              paddingTop: 12,
            }}>
            <View
              style={{
                marginBottom: 12,
                height: 4,
                width: 40,
                alignSelf: 'center',
                borderRadius: 2,
                backgroundColor: colors.border,
              }}
            />
            <Text
              style={{
                marginBottom: 12,
                fontSize: 16,
                fontWeight: '600',
                color: colors.foreground,
              }}>
              Link
            </Text>
            <TextInput
              value={linkValue}
              onChangeText={setLinkValue}
              placeholder="https://…"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="url"
              style={{
                marginBottom: 12,
                borderRadius: 14,
                backgroundColor: colors.muted,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: colors.foreground,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {state.isLinkActive ? (
                <Pressable
                  onPress={() => {
                    editor.setLink(null);
                    setLinkOpen(false);
                  }}
                  accessibilityLabel="Remove link"
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: withOpacity(colors.border, 0.9),
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}>
                  <RemoveFormatting size={20} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  editor.setLink(linkValue.trim() || null);
                  setLinkOpen(false);
                }}
                accessibilityLabel="Apply link"
                style={{
                  flex: 1,
                  alignItems: 'center',
                  borderRadius: 14,
                  backgroundColor: colors.foreground,
                  paddingVertical: 12,
                }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.background }}>
                  Apply
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
