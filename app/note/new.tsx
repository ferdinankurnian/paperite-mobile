import { useRouter } from 'expo-router';
import { Stack as JsStack } from 'expo-router/js-stack';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import type { EditorBridge } from '@10play/tentap-editor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSpace } from '@/lib/SpaceContext';
import { useColorScheme } from '@/lib/useColorScheme';
import { AppHeader } from '@/components/app/AppHeader';
import { NoteEditor } from '@/components/app/NoteEditor';

export default function NewNoteScreen() {
  const { colors } = useColorScheme();
  const { activeSpaceName } = useSpace();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const editorRef = useRef<EditorBridge | null>(null);
  const [title, setTitle] = useState('');

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
        <PaperText
          variant="labelMedium"
          style={{ color: colors.mutedForeground, marginBottom: 4, paddingHorizontal: 20 }}>
          in {activeSpaceName}
        </PaperText>
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
            autofocus
            initialBody=""
            placeholder="Start writing..."
            onEditorReady={(editor) => {
              editorRef.current = editor;
            }}
          />
        </View>
      </View>
    </View>
  );
}
