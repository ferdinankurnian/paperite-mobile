import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';

import { Button } from '@/components/ui/Button';
import { UI_AUDIT } from '@/lib/ui-audit';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

const UI_KIT_SECTIONS = [
  {
    id: 'button',
    title: 'Button',
    desc: 'pill ala toolbar — fit content, center. icon bulet tetap ToolbarItem',
  },
  { id: 'separator', title: 'Separator', desc: 'ToolbarSeparator, divider row — kosong, isi pas audit' },
  { id: 'card', title: 'Card', desc: 'card radius 16 + border — kosong, isi pas audit' },
  { id: 'row', title: 'Row', desc: 'SettingsRow, list row — kosong, isi pas audit' },
  { id: 'text', title: 'Text', desc: 'typography scale — kosong, isi pas audit' },
  { id: 'sheet', title: 'Sheet', desc: 'bottom sheet + modal — kosong, isi pas audit' },
  { id: 'icon', title: 'Icon', desc: 'material vs lucide vs space icon — kosong, isi pas audit' },
] as const;

const CODE_SNIPPETS: Record<string, string> = {
  button: `// Button — ui/Button.tsx
<Button
  title="Default"
  onPress={save}
/>
<Button
  title="Primary"
  variant="primary"
  onPress={pick}
/>
<Button
  title="Tinted"
  variant="tinted"
  onPress={pick}
/>
<Button
  title="Tinted blue"
  variant="tinted"
  tint="#2563eb"
  onPress={pick}
/>
{/* tint bebas: theme token, hex "#2563eb", rgb(), named */}
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
/>`,
  separator: '// Separator — belum distandardize\n// pencet audit buat lihat temuan',
  card: '// Card — belum distandardize\n// pencet audit buat lihat temuan',
  row: '// Row — belum distandardize\n// pencet audit buat lihat temuan',
  text: '// Text — belum distandardize\n// pencet audit buat lihat temuan',
  sheet: '// Sheet — belum distandardize\n// pencet audit buat lihat temuan',
  icon: '// Icon — belum distandardize\n// pencet audit buat lihat temuan',
};

function ButtonShowcase() {
  return (
    <View style={{ gap: 8 }}>
      <Button title="Default" onPress={() => {}} />
      <Button title="Primary" variant="primary" onPress={() => {}} />
      <Button title="Tinted" variant="tinted" onPress={() => {}} />
      <Button title="Tinted blue" variant="tinted" tint="#2563eb" onPress={() => {}} />
      <Button title="Destructive" variant="destructive" onPress={() => {}} />
      <Button title="Ghost" variant="ghost" onPress={() => {}} />
      <Button title="With icon" icon="image" onPress={() => {}} />
      <Button title="Disabled" disabled onPress={() => {}} />
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
