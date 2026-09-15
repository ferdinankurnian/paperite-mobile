import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Drawer';
import { MaterialSymbol } from '@/components/ui/MaterialSymbol';
import { ToolbarGroup, ToolbarItem } from '@/components/ui/Toolbar';
import { ToolbarTitle } from '@/components/ui/ToolbarTitle';
import { SpaceIcon } from '@/lib/space-icons';
import { UI_AUDIT } from '@/lib/ui-audit';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

const UI_KIT_SECTIONS = [
  {
    id: 'button',
    title: 'Button',
    desc: 'pill h48 fit content + center. size="icon" buat bulet 48',
  },
  {
    id: 'toolbar',
    title: 'Toolbar',
    desc: 'ToolbarItem solo + ToolbarGroup satu permukaan. tanpa separator',
  },
  { id: 'card', title: 'Card', desc: 'default bordered vs ghost borderless ala note list' },
  { id: 'row', title: 'Row', desc: 'SettingsRow, list row — kosong, isi pas audit' },
  { id: 'text', title: 'Text', desc: 'typography scale — kosong, isi pas audit' },
  { id: 'sheet', title: 'Drawer', desc: 'drawer ala create space — snap prop, backdrop 0.4, r28' },
  { id: 'icon', title: 'Icon', desc: 'material vs lucide vs space icon — kosong, isi pas audit' },
] as const;

const CODE_SNIPPETS: Record<string, string> = {
  button: `// Button — ui/Button.tsx
<Button
  title="Default"
  onPress={save}
/>
{/* primary = fill oren theme, tint dikunci */}
<Button
  title="Primary"
  variant="primary"
  onPress={pick}
/>
{/* tinted = fill warna bebas, kasih tint apa aja */}
<Button
  title="Tinted green"
  variant="tinted"
  tint="#16a34a"
  onPress={pick}
/>
<Button
  title="Tinted blue"
  variant="tinted"
  tint="#2563eb"
  onPress={pick}
/>
<Button
  title="Destructive"
  variant="destructive"
  onPress={remove}
/>
<Button
  title="Ghost"
  variant="ghost"
  onPress={back}
/>
<Button
  title="With icon"
  icon="image"
  onPress={pick}
/>
<Button
  title="Disabled"
  disabled
  onPress={save}
/>
{/* icon-only bulet 48 — title opsional, jadi accessibility */}
<Button
  size="icon"
  icon="image"
  accessibilityLabel="Pick image"
  onPress={pick}
/>
<Button
  size="icon"
  icon="add"
  variant="primary"
  accessibilityLabel="Add"
  onPress={add}
/>
<Button
  size="icon"
  icon="check"
  variant="tinted"
  tint="#16a34a"
  accessibilityLabel="Confirm"
  onPress={confirm}
/>
<Button
  size="icon"
  icon="delete"
  variant="destructive"
  accessibilityLabel="Delete"
  onPress={remove}
/>`,
  toolbar: `// Toolbar — ui/Toolbar.tsx
// solo buat 1 action (back, save)
<ToolbarItem icon="arrow_back_ios_new" accessibilityLabel="Back" onPress={back} />

// bleed: SATU pressable satu pill — ripple + scale satu permukaan,
// action di-route dari posisi tap. tanpa separator, tanpa trigger nested.
<ToolbarGroup
  accessibilityLabel="Edit actions"
  actions={[
    { icon: 'undo', accessibilityLabel: 'Undo', onPress: undo },
    { icon: 'redo', accessibilityLabel: 'Redo', onPress: redo },
  ]}
/>

// bar left / right aja — mobile, ga ada center
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <ToolbarItem icon="arrow_back_ios_new" accessibilityLabel="Back" onPress={back} />
  <View style={{ flex: 1 }} />
  <ToolbarGroup
    accessibilityLabel="Edit actions with menu"
    actions={[
      { icon: 'undo', accessibilityLabel: 'Undo', onPress: undo },
      { icon: 'redo', accessibilityLabel: 'Redo', onPress: redo },
    ]}
    menu={{
      icon: 'more_vert',
      accessibilityLabel: 'More options',
      entries: [
        { title: 'Rename', icon: 'edit', accessibilityLabel: 'Rename', onPress: rename },
        { title: 'Delete', icon: 'delete', accessibilityLabel: 'Delete', onPress: remove },
      ],
    }}
  />
</View>

// note list: copy AppHeader variant="space" — drawer + space pill
// + kanan grup select + titik tiga. kiri flex:1 biar grup nempel ujung kanan.
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
    <ToolbarItem accessibilityLabel="Open drawer" onPress={openDrawer} hitSlop={12}>
      <MaterialSymbol name="dock_to_right" size={26} color={colors.foreground} />
    </ToolbarItem>
      <ToolbarItem
        accessibilityLabel="Open Inbox"
        onPress={() => setLast('Inbox')}
        style={{
          paddingHorizontal: 12,
          flexDirection: 'row',
          gap: 8,
        }}>
        <SpaceIcon name="inbox" size={20} color={colors.foreground} />
        <Text
          numberOfLines={1}
          style={{ color: colors.foreground, fontSize: 17, fontWeight: '600', flexShrink: 1 }}>
          Inbox
        </Text>
      </ToolbarItem>
  </View>
  <ToolbarGroup
    accessibilityLabel="List actions"
    actions={[{ icon: 'check_box', accessibilityLabel: 'Select notes', onPress: select }]}
    menu={{
      icon: 'more_vert',
      accessibilityLabel: 'List actions',
      entries: [
        { title: 'Select', icon: 'check_box', accessibilityLabel: 'Select', onPress: select },
        { title: 'Delete', icon: 'delete', accessibilityLabel: 'Delete', onPress: remove },
      ],
    }}
  />
</View>

// note content: copy AppHeader variant="editor" — back ios + saved +
// sub timestamp + kanan undo/redo grup + titik tiga BOLA SENDIRI.
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <ToolbarItem icon="arrow_back_ios_new" accessibilityLabel="Back" onPress={back} />
  <ToolbarTitle title="Saved" subtitle="Edited 17:02" />
  <ToolbarGroup
    accessibilityLabel="Edit actions"
    actions={[
      { icon: 'undo', accessibilityLabel: 'Undo', onPress: undo },
      { icon: 'redo', accessibilityLabel: 'Redo', onPress: redo },
    ]}
  />
  <ToolbarItem icon="more_vert" accessibilityLabel="More options" onPress={more} />
</View>`,
  card: `// Card — ui/Card.tsx
// default = bordered ala settings (r16 + border 1)
// ghost = borderless ala note list (transparent, tanpa border)
// padding + isi bebas lewat children / style
<Card style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
  <PaperText variant="titleMedium">Info card</PaperText>
  <PaperText variant="bodySmall">ala about</PaperText>
</Card>
// grup ala settings list — row + divider di dalam Card
<Card>
  <View style={{ flexDirection: 'row', padding: 14 }}>{/* row 1 */}</View>
  <View style={{ marginLeft: 50, height: 1 }} />
  <View style={{ flexDirection: 'row', padding: 14 }}>{/* row 2 */}</View>
</Card>
// action card — teks + tombol
<Card style={{ padding: 16 }}>
  <PaperText variant="titleMedium">Storage almost full</PaperText>
  <Button title="Upgrade" variant="primary" onPress={upgrade} />
</Card>
<Card variant="ghost" style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
  <PaperText variant="titleMedium">Note title</PaperText>
  <PaperText variant="bodyMedium">note list row-style, no border</PaperText>
</Card>
// ghost + tint pas select mode (ala NoteRow kepilih)
<Card
  variant="ghost"
  style={{ backgroundColor: withOpacity(colors.primary, 0.12) }}
/>`,
  row: '// Row — belum distandardize\n// pencet audit buat lihat temuan',
  text: '// Text — belum distandardize\n// pencet audit buat lihat temuan',
  sheet: `// Drawer — ui/Drawer.tsx
// reunite CreateSpaceSheet (94%) + FolderNameSheet (40%) + MoveSheet (60%).
// backdrop 0.4 + r28 + bg card dikunci, snap + isi bebas.
const tallRef = useRef<BottomSheetModal>(null);
const halfRef = useRef<BottomSheetModal>(null);

// 1: tall 95% — ala create space
<Button title="Open tall drawer" onPress={() => tallRef.current?.present()} />
<Drawer sheetRef={tallRef} snapPoints={['95%']}>
  <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
    <PaperText variant="titleMedium">Hello</PaperText>
  </View>
</Drawer>

// 2: half 50% — tarik ke atas buat full 95%
<Button title="Open half drawer" onPress={() => halfRef.current?.present()} />
<Drawer sheetRef={halfRef} snapPoints={['50%', '95%']}>
  <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
    ...
  </View>
</Drawer>
// konten panjang yang butuh scroll di dalam? bungkus isi pake
// BottomSheetScrollView dari '@gorhom/bottom-sheet'. catatan: pas list
// lagi kescroll terus sheet ditarik ke bawah, list balik ke atas dulu
// baru sheet dismiss — itu handoff standar, bukan bug.`,
  icon: '// Icon — belum distandardize\n// pencet audit buat lihat temuan',
};

function ButtonShowcase() {
  return (
    <View style={{ gap: 8 }}>
      <Button title="Default" onPress={() => {}} />
      <Button title="Primary" variant="primary" onPress={() => {}} />
      <Button title="Tinted green" variant="tinted" tint="#16a34a" onPress={() => {}} />
      <Button title="Tinted blue" variant="tinted" tint="#2563eb" onPress={() => {}} />
      <Button title="Destructive" variant="destructive" onPress={() => {}} />
      <Button title="Ghost" variant="ghost" onPress={() => {}} />
      <Button title="With icon" icon="image" onPress={() => {}} />
      <Button title="Disabled" disabled onPress={() => {}} />
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        <Button size="icon" icon="image" accessibilityLabel="Pick image" onPress={() => {}} />
        <Button
          size="icon"
          icon="add"
          variant="primary"
          accessibilityLabel="Add"
          onPress={() => {}}
        />
        <Button
          size="icon"
          icon="check"
          variant="tinted"
          tint="#16a34a"
          accessibilityLabel="Confirm"
          onPress={() => {}}
        />
        <Button
          size="icon"
          icon="delete"
          variant="destructive"
          accessibilityLabel="Delete"
          onPress={() => {}}
        />
      </View>
    </View>
  );
}

function CardShowcase() {
  const { colors } = useColorScheme();
  return (
    <View style={{ gap: 16 }}>
      {/* default — bordered */}
      <View style={{ gap: 8 }}>
        <PaperText variant="labelLarge" style={{ color: colors.mutedForeground }}>
          Default — bordered
        </PaperText>
        {/* 1. info ala about */}
        <Card style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 2 }}>
          <PaperText variant="titleMedium" style={{ color: colors.foreground }}>
            Info card
          </PaperText>
          <PaperText variant="bodySmall" style={{ color: colors.mutedForeground }}>
            r16 + border 1, ala settings / appearance / about
          </PaperText>
        </Card>
        {/* 2. grup ala settings list — 2 row + divider */}
        <Card style={{ overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
            <MaterialSymbol name="palette" size={24} color={colors.foreground} />
            <PaperText variant="bodyLarge" style={{ color: colors.foreground, flex: 1 }}>
              Appearance
            </PaperText>
            <PaperText variant="bodyMedium" style={{ color: colors.mutedForeground }}>
              Dark
            </PaperText>
          </View>
          <View
            style={{
              marginLeft: 50,
              marginRight: 16,
              height: 1,
              backgroundColor: withOpacity(colors.border, 0.9),
            }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
            <MaterialSymbol name="info" size={24} color={colors.foreground} />
            <PaperText variant="bodyLarge" style={{ color: colors.foreground, flex: 1 }}>
              About
            </PaperText>
            <PaperText variant="bodyMedium" style={{ color: colors.mutedForeground }}>
              v1.0.0
            </PaperText>
          </View>
        </Card>
        {/* 3. action card — teks + tombol */}
        <Card style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
          <View style={{ gap: 2 }}>
            <PaperText variant="titleMedium" style={{ color: colors.foreground }}>
              Storage almost full
            </PaperText>
            <PaperText variant="bodySmall" style={{ color: colors.mutedForeground }}>
              bordered juga bisa nampung action, bukan cuma teks
            </PaperText>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Later" variant="ghost" onPress={() => {}} />
            <Button title="Upgrade" variant="primary" onPress={() => {}} />
          </View>
        </Card>
      </View>

      {/* ghost — borderless */}
      <View style={{ gap: 8 }}>
        <PaperText variant="labelLarge" style={{ color: colors.mutedForeground }}>
          Ghost — borderless
        </PaperText>
        {/* 1. note item ala note list */}
        <Card variant="ghost" style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <PaperText
            variant="titleMedium"
            style={{ color: colors.foreground, fontSize: 18, fontWeight: '600' }}
            numberOfLines={1}>
            Ghost — Untitled
          </PaperText>
          <PaperText variant="bodyMedium" style={{ color: colors.mutedForeground }} numberOfLines={2}>
            transparent tanpa border, konten yang ngomong
          </PaperText>
        </Card>
        {/* 2. folder item — ghost juga bisa buat row icon + meta */}
        <Card variant="ghost" style={{ paddingHorizontal: 12, paddingVertical: 11 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MaterialSymbol name="chevron_right" size={22} color={colors.mutedForeground} />
            <MaterialSymbol name="folder" size={22} color={colors.primary} />
            <PaperText
              variant="titleMedium"
              style={{ color: colors.foreground, fontSize: 17, fontWeight: '600', flex: 1 }}
              numberOfLines={1}>
              Projects
            </PaperText>
            <PaperText variant="labelMedium" style={{ color: colors.mutedForeground }}>
              12
            </PaperText>
          </View>
        </Card>
        {/* 3. selected state — ghost + tint, ala NoteRow kepilih */}
        <Card
          variant="ghost"
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: withOpacity(colors.primary, 0.12),
          }}>
          <PaperText
            variant="titleMedium"
            style={{ color: colors.foreground, fontSize: 18, fontWeight: '600' }}
            numberOfLines={1}>
            Selected note
          </PaperText>
          <PaperText variant="bodyMedium" style={{ color: colors.mutedForeground }} numberOfLines={1}>
            ghost + tint primary 0.12 pas select mode
          </PaperText>
        </Card>
      </View>
    </View>
  );
}

function ToolbarShowcase() {
  const { colors } = useColorScheme();
  const [last, setLast] = useState<string | null>(null);
  return (
    <View style={{ gap: 20, paddingVertical: 4 }}>
      {/* solo */}
      <View style={{ alignItems: 'center' }}>
        <ToolbarItem icon="arrow_back_ios_new" accessibilityLabel="Back" onPress={() => {}} />
      </View>
      {/* bleed: satu permukaan, ripple + scale pill */}
      <View style={{ alignItems: 'center', gap: 12 }}>
        <ToolbarGroup
          accessibilityLabel="Edit actions"
          actions={[
            { icon: 'undo', accessibilityLabel: 'Undo' },
            { icon: 'redo', accessibilityLabel: 'Redo' },
          ]}
          onZonePress={setLast}
        />
        <ToolbarGroup
          accessibilityLabel="Edit actions with menu"
          actions={[
            { icon: 'undo', accessibilityLabel: 'Undo' },
            { icon: 'redo', accessibilityLabel: 'Redo' },
          ]}
          menu={{
            icon: 'more_vert',
            accessibilityLabel: 'More options',
            entries: [
              { title: 'Rename', icon: 'edit', accessibilityLabel: 'Rename', onPress: () => setLast('Rename') },
              { title: 'Delete', icon: 'delete', accessibilityLabel: 'Delete', onPress: () => setLast('Delete') },
              {
                type: 'submenu',
                title: 'Sort by',
                icon: 'sort',
                accessibilityLabel: 'Sort by',
                children: [
                  { title: 'Name', accessibilityLabel: 'Sort by name', onPress: () => setLast('Sort: Name') },
                  { title: 'Date', accessibilityLabel: 'Sort by date', onPress: () => setLast('Sort: Date') },
                ],
              },
            ],
          }}
          onZonePress={setLast}
        />
        <PaperText variant="bodySmall" style={{ color: colors.mutedForeground }}>
          {last ? `last: ${last}` : 'tap undo / redo / titik tiga'}
        </PaperText>
      </View>
      {/* bar left / right aja — mobile, ga ada center */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ToolbarItem icon="arrow_back_ios_new" accessibilityLabel="Back" onPress={() => {}} />
        <View style={{ flex: 1 }} />
        <ToolbarGroup
          accessibilityLabel="Edit actions with menu"
          actions={[
            { icon: 'undo', accessibilityLabel: 'Undo' },
            { icon: 'redo', accessibilityLabel: 'Redo' },
          ]}
          menu={{
            icon: 'more_vert',
            accessibilityLabel: 'More options',
            entries: [
              { title: 'Rename', icon: 'edit', accessibilityLabel: 'Rename', onPress: () => setLast('Rename') },
              { title: 'Delete', icon: 'delete', accessibilityLabel: 'Delete', onPress: () => setLast('Delete') },
            ],
          }}
          onZonePress={setLast}
        />
      </View>
      {/* teks leading — polos tanpa pill, di sebelah tombol kiri */}
      {/* note list: copy AppHeader variant="space" — drawer + space pill + kanan grup select + titik tiga */}
      {/* kiri dibungkus flex:1 biar grup kanan nempel ujung kanan, bukan ngikut pill */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <ToolbarItem accessibilityLabel="Open drawer" onPress={() => {}} hitSlop={12}>
            <MaterialSymbol name="dock_to_right" size={26} color={colors.foreground} />
          </ToolbarItem>
          <ToolbarItem
            accessibilityLabel="Open Inbox"
            onPress={() => setLast('Inbox')}
            style={{
              paddingHorizontal: 12,
              flexDirection: 'row',
              gap: 8,
            }}>
            <SpaceIcon name="inbox" size={20} color={colors.foreground} />
            <Text
              numberOfLines={1}
              style={{ color: colors.foreground, fontSize: 17, fontWeight: '600', flexShrink: 1 }}>
              Inbox
            </Text>
          </ToolbarItem>
        </View>
        <ToolbarGroup
          accessibilityLabel="List actions"
          actions={[{ icon: 'check_box', accessibilityLabel: 'Select notes' }]}
          menu={{
            icon: 'more_vert',
            accessibilityLabel: 'List actions',
            entries: [
              { title: 'Select', icon: 'check_box', accessibilityLabel: 'Select', onPress: () => setLast('Select') },
              { title: 'Delete', icon: 'delete', accessibilityLabel: 'Delete', onPress: () => setLast('Delete') },
            ],
          }}
          onZonePress={setLast}
        />
      </View>
      {/* note content: back ios + saved + sub timestamp + kanan undo/redo + titik tiga bola sendiri */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ToolbarItem icon="arrow_back_ios_new" accessibilityLabel="Back" onPress={() => {}} />
        <ToolbarTitle title="Saved" subtitle="Edited 17:02" />
        <ToolbarGroup
          accessibilityLabel="Edit actions"
          actions={[
            { icon: 'undo', accessibilityLabel: 'Undo' },
            { icon: 'redo', accessibilityLabel: 'Redo' },
          ]}
          onZonePress={setLast}
        />
        <ToolbarItem icon="more_vert" accessibilityLabel="More options" onPress={() => setLast('More options')} />
      </View>
    </View>
  );
}

function DrawerShowcase() {
  const { colors } = useColorScheme();
  const tallRef = useRef<BottomSheetModal | null>(null);
  const halfRef = useRef<BottomSheetModal | null>(null);
  const tallSnap = useMemo(() => ['95%'], []);
  const halfSnap = useMemo(() => ['50%', '95%'], []);
  return (
    <View style={{ gap: 8 }}>
      <Button title="Open tall drawer" onPress={() => tallRef.current?.present()} />
      <Button title="Open half drawer" variant="primary" onPress={() => halfRef.current?.present()} />
      {/* 1: tall 95% — ala create space */}
      <Drawer sheetRef={tallRef} snapPoints={tallSnap}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 8 }}>
          <PaperText
            variant="titleMedium"
            style={{ color: colors.foreground, fontWeight: '700', textAlign: 'center' }}>
            Tall drawer — 95%
          </PaperText>
          <PaperText
            variant="bodySmall"
            style={{ color: colors.mutedForeground, textAlign: 'center' }}>
            ala create space. geser ke bawah buat tutup.
          </PaperText>
          <Card style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <PaperText variant="bodyMedium" style={{ color: colors.foreground }}>
              isi bebas — form / list / preview space di sini
            </PaperText>
          </Card>
          <Button title="Close" onPress={() => tallRef.current?.dismiss()} />
        </View>
      </Drawer>
      {/* 2: half 50% — tarik ke atas buat full 95%. konten sengaja dibikin
          muat tanpa inner scroll biar ga ada rebutan gesture scroll-vs-drag
          (itu yang bikin ghost: list mental ke atas dulu baru sheet dismiss) */}
      <Drawer sheetRef={halfRef} snapPoints={halfSnap}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 8 }}>
          <PaperText
            variant="titleMedium"
            style={{ color: colors.foreground, fontWeight: '700', textAlign: 'center' }}>
            Half drawer — 50%
          </PaperText>
          <PaperText
            variant="bodySmall"
            style={{ color: colors.mutedForeground, textAlign: 'center' }}>
            stop di tengah. tarik ke atas buat 95%, geser bawah buat tutup.
          </PaperText>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <PaperText variant="bodyMedium" style={{ color: colors.foreground }}>
                row {i} — muat pas 50%, lega pas 95%
              </PaperText>
            </Card>
          ))}
          <Button title="Close" onPress={() => halfRef.current?.dismiss()} />
        </View>
      </Drawer>
    </View>
  );
}

function CodeBlock({ code }: { code: string }) {
  const { colors } = useColorScheme();
  return (
    <View
      style={{
        backgroundColor: withOpacity(colors.foreground, 0.06),
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}>
      <PaperText
        variant="bodySmall"
        style={{ color: colors.foreground, fontFamily: 'monospace', lineHeight: 20 }}>
        {code}
      </PaperText>
    </View>
  );
}

function AuditFindings({ id }: { id: string }) {
  const { colors } = useColorScheme();
  const findings = UI_AUDIT[id] ?? [];
  if (findings.length === 0) return null;
  return (
    <View style={{ gap: 12, paddingTop: 4 }}>
      {findings.map((f) => (
        <View key={f.pattern} style={{ gap: 4 }}>
          <PaperText variant="labelLarge" style={{ color: colors.foreground }}>
            {f.pattern}
          </PaperText>
          {f.where.map((w) => (
            <PaperText key={w} variant="bodySmall" style={{ color: colors.mutedForeground }}>
              · {w}
            </PaperText>
          ))}
          <PaperText variant="bodySmall" style={{ color: colors.primary }}>
            → {f.fix}
          </PaperText>
        </View>
      ))}
    </View>
  );
}

function UiKitSection({
  id,
  title,
  desc,
  showAudit,
}: {
  id: string;
  title: string;
  desc: string;
  showAudit: boolean;
}) {
  const { colors } = useColorScheme();
  const [mode, setMode] = useState<'preview' | 'code'>('preview');
  return (
    <View style={{ gap: 8, paddingTop: 8 }}>
      <View style={{ paddingHorizontal: 4, gap: 2 }}>
        <PaperText variant="titleLarge" style={{ color: colors.foreground }}>
          {title}
        </PaperText>
        <PaperText variant="bodySmall" style={{ color: colors.mutedForeground }}>
          {desc}
        </PaperText>
      </View>
      <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 4 }}>
        {(['preview', 'code'] as const).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              android_ripple={{ color: withOpacity(colors.foreground, 0.14) }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: active ? withOpacity(colors.foreground, 0.1) : 'transparent',
              }}>
              <PaperText
                variant="labelLarge"
                style={{ color: active ? colors.foreground : colors.mutedForeground }}>
                {m === 'preview' ? 'Preview' : 'Code'}
              </PaperText>
            </Pressable>
          );
        })}
      </View>
      {mode === 'code' ? (
        <CodeBlock code={CODE_SNIPPETS[id] ?? ''} />
      ) : showAudit ? (
        <View style={{ paddingHorizontal: 4 }}>
          <AuditFindings id={id} />
        </View>
      ) : (
        <View
          style={{
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: withOpacity(colors.mutedForeground, 0.4),
            borderRadius: 12,
            paddingVertical: 16,
            paddingHorizontal: 12,
            alignItems: 'stretch',
            justifyContent: 'center',
          }}>
          {id === 'button' ? (
            <ButtonShowcase />
          ) : id === 'card' ? (
            <CardShowcase />
          ) : id === 'toolbar' ? (
            <ToolbarShowcase />
          ) : id === 'sheet' ? (
            <DrawerShowcase />
          ) : (
            <PaperText
              variant="bodySmall"
              style={{ color: colors.mutedForeground, textAlign: 'center' }}>
              empty
            </PaperText>
          )}
        </View>
      )}
    </View>
  );
}

export function ComponentsBody({ showAudit }: { showAudit: boolean }) {
  return (
    <>
      {UI_KIT_SECTIONS.map((s) => (
        <UiKitSection
          key={s.id}
          id={s.id}
          title={s.title}
          desc={s.desc}
          showAudit={showAudit}
        />
      ))}
    </>
  );
}
