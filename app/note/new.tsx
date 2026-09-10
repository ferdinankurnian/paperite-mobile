import { useRouter } from 'expo-router';
import { Stack as JsStack } from 'expo-router/js-stack';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSpace } from '@/lib/SpaceContext';
import { useColorScheme } from '@/lib/useColorScheme';
import { AppHeader } from '@/components/app/AppHeader';
import { TipTapEditor } from '@/components/app/TipTapEditor';
import type { MobileEditor, TipTapDoc } from '@/lib/editor/types';
import { createNote, ensureStorageReady, updateNote } from '@/lib/storage';
import type { NoteContent } from '@/lib/storage/notes';

const AUTOSAVE_DELAY = 800;
const EMPTY_DOC: TipTapDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

/**
 * note baru dibikin LAZY: file + db row baru ditulis pas user mulai ngetik
 * (judul / isi). back dalam keadaan kosong = ga ninggalin sampah.
 */
export default function NewNoteScreen() {
  const { colors } = useColorScheme();
  const { activeSpaceId, activeSpaceName } = useSpace();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const editorRef = useRef<MobileEditor | null>(null);
  const [title, setTitle] = useState('');
  const createdId = useRef<string | null>(null);
  const pendingContent = useRef<NoteContent | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({ title: '', spaceId: activeSpaceId });
  useEffect(() => {
    stateRef.current = { title, spaceId: activeSpaceId };
  }, [title, activeSpaceId]);

  const ensureCreated = async (): Promise<string | null> => {
    if (createdId.current) return createdId.current;
    const { title: t, spaceId } = stateRef.current;
    if (!t.trim() && pendingContent.current === null) return null;
    await ensureStorageReady();
    const note = await createNote({
      spaceId,
      title: t.trim() || 'Untitled',
      content: pendingContent.current ?? [{ type: 'paragraph' }],
    }).catch(() => null);
    if (note) createdId.current = note.id;
    return createdId.current;
  };

  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      ensureCreated().then((nid) => {
        if (!nid) return;
        const { title: t } = stateRef.current;
        updateNote(nid, {
          title: t,
          ...(pendingContent.current !== null ? { content: pendingContent.current } : {}),
        }).catch(() => undefined);
      });
    }, AUTOSAVE_DELAY);
  };

  const handleBack = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const { title: t } = stateRef.current;
    if (!t.trim() && pendingContent.current === null) {
      router.back();
      return;
    }
    ensureCreated().then((nid) => {
      if (nid) {
        // replace biar back dari editor balik ke list, bukan ke layar new kosong.
        router.replace(`/note/${nid}`);
      } else {
        router.back();
      }
    });
  };

  // flush kalau screen di-unmount tanpa lewat handleBack (gesture edge, dsb).
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const { title: t } = stateRef.current;
      if (!t.trim() && pendingContent.current === null) return;
      ensureCreated().then((nid) => {
        if (!nid) return;
        updateNote(nid, {
          title: stateRef.current.title,
          ...(pendingContent.current !== null ? { content: pendingContent.current } : {}),
        }).catch(() => undefined);
      });
    };
  }, []);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <JsStack.Screen
        options={{
          header: () => (
            <AppHeader
              variant="editor"
              onLeftPress={handleBack}
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
        <View style={{ flex: 1 }}>
          <TipTapEditor
            autofocusTitle
            initialContent={EMPTY_DOC}
            title={title}
            placeholder="Start writing..."
            onReady={(editor) => {
              editorRef.current = editor;
            }}
            onTitleChange={(t) => {
              setTitle(t);
              scheduleSave();
            }}
            onContentChange={(doc) => {
              pendingContent.current = doc.content as NoteContent;
              scheduleSave();
            }}
          />
        </View>
      </View>
    </View>
  );
}
