import { Text } from 'react-native';

import { useColorScheme } from '@/lib/useColorScheme';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** label parity sama paperite web (saveStatusLabel di editor-ui-store). */
export function saveStatusLabel(status: SaveStatus): string {
  if (status === 'saving') return 'Saving...';
  if (status === 'saved') return 'Saved';
  if (status === 'error') return 'Error';
  return '';
}

export function SaveStatusText({ status }: { status: SaveStatus }) {
  const { colors } = useColorScheme();
  const label = saveStatusLabel(status);
  if (!label) return null;
  return (
    <Text
      numberOfLines={1}
      style={{
        color: status === 'error' ? colors.destructive : colors.mutedForeground,
        fontSize: 15,
        fontWeight: '500',
        flexShrink: 1,
        paddingLeft: 4,
      }}
      accessibilityLabel={label}>
      {label}
    </Text>
  );
}
