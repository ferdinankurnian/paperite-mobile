import { FlashList } from '@shopify/flash-list';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { cssInterop } from 'nativewind';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { NotesFab } from '@/components/NotesFab';
import { getNotesForSpace, getSpaceById, type Note } from '@/lib/paperite-data';
import { useSpace } from '@/lib/SpaceContext';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

/** Spacer bawah list: 112 (ruang FAB) + tinggi keyboard, animasi ikut keyboard. */
function ListKeyboardSpacer() {
  const { height } = useReanimatedKeyboardAnimation();
  const style = useAnimatedStyle(() => ({
    height: 112 + Math.abs(height.value),
  }));
  return <Animated.View style={style} />;
}

cssInterop(FlashList, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});

function NoteRow({ note }: { note: Note }) {
  const { colors, isDarkColorScheme } = useColorScheme();
  const noteSurface = isDarkColorScheme ? withOpacity(colors.card, 0.68) : colors.card;

  return (
    <View
      className="mx-2 mb-2 rounded-xl"
      style={{
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
      }}>
      <Pressable
        onPress={() => router.push(`/note/${note.id}`)}
        className="px-4 py-3 active:opacity-80"
        android_ripple={{
          color: withOpacity(colors.foreground, 0.14),
          borderless: false,
        }}
        style={({ pressed }) => [pressed && { opacity: 0.82 }]}>
        <View className="mb-1 flex-row items-center gap-2">
          <PaperText
            variant="titleMedium"
            style={{ color: colors.foreground, fontSize: 18, fontWeight: '600', flex: 1 }}
            numberOfLines={1}>
            {note.title}
          </PaperText>
        </View>
        <PaperText variant="bodyMedium" style={{ color: colors.mutedForeground }} numberOfLines={2}>
          {note.preview}
        </PaperText>
      </Pressable>
    </View>
  );
}

export default function NotesListScreen() {
  const { colors } = useColorScheme();
  const { activeSpaceId } = useSpace();
  const allNotes = getNotesForSpace(activeSpaceId);
  const space = getSpaceById(activeSpaceId);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 70;
  const [search, setSearch] = useState('');

  const notes =
    search.trim().length === 0
      ? allNotes
      : allNotes.filter((n) => {
          const q = search.trim().toLowerCase();
          return n.title.toLowerCase().includes(q) || n.preview.toLowerCase().includes(q);
        });

  // inbox + spaces + trash: fab note. folder cuma di user space
  const showFab = activeSpaceId !== 'trash';
  const showNewFolder = space?.kind === 'space';

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({ swipeEnabled: true });
    }, [navigation])
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <FlashList
        data={notes}
        keyExtractor={(item) => item.id}
        estimatedItemSize={88}
        // Keep a generous native render buffer so fast flings don't expose blank rows.
        drawDistance={1600}
        contentContainerStyle={{
          paddingTop: headerHeight + 8,
          paddingBottom: 8,
          ...(notes.length === 0 ? { flexGrow: 1, paddingTop: 0 } : null),
        }}
        ListFooterComponent={notes.length === 0 ? null : <ListKeyboardSpacer />}
        renderItem={({ item }) => <NoteRow note={item} />}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center gap-2 px-8">
            <MaterialIcons
              name={search.trim() ? 'search-off' : 'note-add'}
              size={40}
              color={colors.mutedForeground}
            />
            <PaperText variant="titleMedium" style={{ color: colors.foreground }}>
              {search.trim() ? 'ga ketemu' : 'no notes yet'}
            </PaperText>
            <PaperText
              variant="bodyMedium"
              style={{ color: colors.mutedForeground, textAlign: 'center' }}>
              {search.trim()
                ? `ga ada note yang match "${search.trim()}"`
                : 'space ini masih kosong. tekan + buat note baru.'}
            </PaperText>
          </View>
        }
      />

      <NotesFab
        search={search}
        onSearchChange={setSearch}
        showAdd={showFab}
        showNewFolder={showNewFolder}
      />
    </View>
  );
}
