import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack as JsStack } from 'expo-router/js-stack';
import { ScrollView, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { getNoteById } from '@/lib/paperite-data';
import { useColorScheme } from '@/lib/useColorScheme';
import { NotesHeader } from '@/components/NotesHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const note = getNoteById(id ?? '');

  if (!note) {
    return (
      <View
        className="flex-1 items-center justify-center gap-3"
        style={{ backgroundColor: colors.background }}>
        <JsStack.Screen options={{ title: 'Note' }} />
        <MaterialIcons name="error-outline" size={40} color={colors.mutedForeground} />
        <PaperText variant="titleMedium" style={{ color: colors.foreground }}>
          note ga ketemu
        </PaperText>
        <PaperText
          variant="bodyMedium"
          style={{ color: colors.primary }}
          onPress={() => router.back()}>
          balik
        </PaperText>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <JsStack.Screen
        options={{
          header: () => (
            <NotesHeader
              showCenter={false}
              leftIcon="back"
              onLeftPress={() => router.back()}
              showUndoRedo
            />
          ),
          headerTransparent: true,
          headerShadowVisible: false,
          cardStyle: { backgroundColor: colors.background },
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 78,
          paddingHorizontal: 20,
          paddingBottom: 48,
        }}
        keyboardShouldPersistTaps="handled">
        <PaperText
          variant="headlineSmall"
          style={{ color: colors.foreground, fontWeight: '700', marginBottom: 16 }}>
          {note.title}
        </PaperText>
        <PaperText variant="bodyLarge" style={{ color: colors.foreground, lineHeight: 26 }}>
          {note.body}
        </PaperText>
      </ScrollView>
    </View>
  );
}
