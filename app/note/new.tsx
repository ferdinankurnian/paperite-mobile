import { useRouter } from 'expo-router';
import { Stack as JsStack } from 'expo-router/js-stack';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';

import { useSpace } from '@/lib/SpaceContext';
import { useColorScheme } from '@/lib/useColorScheme';

export default function NewNoteScreen() {
  const { colors } = useColorScheme();
  const { activeSpaceName } = useSpace();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <JsStack.Screen
        options={{
          title: 'New note',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
          cardStyle: { backgroundColor: colors.background },
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <PaperText
          variant="labelMedium"
          style={{ color: colors.mutedForeground, marginBottom: 8 }}
        >
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
            marginBottom: 16,
            padding: 0,
          }}
        />
        <TextInput
          placeholder="Start writing..."
          placeholderTextColor={colors.mutedForeground}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          style={{
            color: colors.foreground,
            fontSize: 16,
            lineHeight: 24,
            minHeight: 240,
            padding: 0,
          }}
        />
        <PaperText
          variant="bodySmall"
          style={{ color: colors.mutedForeground, marginTop: 24 }}
          onPress={() => router.back()}
        >
          (mock — belum save. tap buat balik)
        </PaperText>
      </ScrollView>
    </View>
  );
}
