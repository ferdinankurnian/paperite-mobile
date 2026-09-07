import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack as JsStack } from 'expo-router/js-stack';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { EditorBridge } from '@10play/tentap-editor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getNoteById } from '@/lib/paperite-data';
import { useColorScheme } from '@/lib/useColorScheme';
import { AppHeader } from '@/components/app/AppHeader';
import { NoteEditor } from '@/components/app/NoteEditor';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const note = getNoteById(id ?? '');
  const editorRef = useRef<EditorBridge | null>(null);
  const [title, setTitle] = useState(note?.title ?? '');

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
            <AppHeader
              variant="editor"
              onLeftPress={() => router.back()}
              onUndoPress={() => editorRef.current?.undo()}
              onRedoPress={() => editorRef.current?.redo()}
            />
          ),
          headerTransparent: true,
          headerShadowVisible: false,
          cardStyle: { backgroundColor: colors.background },
        }}
      />
      <View style={{ flex: 1, paddingTop: insets.top + 78 }}>
        <TextInput
          placeholder="Title"
          placeholderTextColor={colors.mutedForeground}
          value={title}
          onChangeText={setTitle}
          style={{
            color: colors.foreground,
            fontSize: 22,
            fontWeight: '700',
            paddingHorizontal: 20,
            paddingBottom: 12,
            paddingTop: 4,
          }}
        />
        <View style={{ flex: 1 }}>
          <NoteEditor
            key={note.id}
            initialBody={note.body}
            onEditorReady={(editor) => {
              editorRef.current = editor;
            }}
          />
        </View>
      </View>
    </View>
  );
}
