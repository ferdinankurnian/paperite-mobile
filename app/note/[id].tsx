import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack as JsStack } from 'expo-router/js-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Note, type NoteWithContent } from '@/lib/paperite-data';
import { useColorScheme } from '@/lib/useColorScheme';
import { AppHeader } from '@/components/app/AppHeader';
import { TipTapEditor } from '@/components/app/TipTapEditor';
import { MaterialSymbol } from '@/components/ui/MaterialSymbol';
import type { MobileEditor, TipTapDoc } from '@/lib/editor/types';
import { ensureStorageReady, readNoteById, updateNote } from '@/lib/storage';
import type { NoteContent } from '@/lib/storage/notes';

const AUTOSAVE_DELAY = 800;

// SATU halaman: header + layout selalu nempel dari detik pertama.
// yang ganti cuma area isi (skeleton → editor / error). ga ada lagi
// "page loading" terpisah yang bikin header kedip ganti.
export default function NoteEditorScreen() {
  // judul + spaceId ikut dikirim dari list biar header + judul langsung
  // tampil tanpa nunggu baca file. dokumen full nyusul di background.
  const { id, title: paramTitle, spaceId: paramSpaceId } = useLocalSearchParams<{
    id: string;
    title?: string;
    spaceId?: string;
  }>();
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const editorRef = useRef<MobileEditor | null>(null);
  const [note, setNote] = useState<NoteWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(paramTitle ?? '');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContent = useRef<NoteContent | null>(null);
  const titleRef = useRef('');
  const titleDirtyRef = useRef(false);
  const noteIdRef = useRef(id ?? '');

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    noteIdRef.current = id ?? '';
    let cancelled = false;
    (async () => {
      setLoading(true);
      await ensureStorageReady();
      const loaded = await readNoteById(id ?? '');
      if (cancelled) return;
      setNote(loaded);
      // user udah ngetik judul duluan (dari params instan) → jangan timpa.
      if (loaded && !titleDirtyRef.current) {
        setTitle(loaded.title);
      } else if (!loaded) {
        setTitle(paramTitle ?? '');
      }
      pendingContent.current = null;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, paramTitle]);

  const scheduleSave = (nextTitle: string, nextContent: NoteContent | null) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const nid = noteIdRef.current;
      if (!nid) return;
      const saved = await updateNote(nid, {
        title: nextTitle,
        ...(nextContent !== null ? { content: nextContent } : {}),
      }).catch(() => null);
      if (saved) {
        pendingContent.current = null;
        setNote(saved);
      }
    }, AUTOSAVE_DELAY);
  };

  // flush pas unmount (back) biar ketikan terakhir ga hilang.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const nid = noteIdRef.current;
      if (nid && pendingContent.current !== null) {
        updateNote(nid, { title: titleRef.current, content: pendingContent.current }).catch(
          () => undefined
        );
      }
    };
  }, []);

  // header butuh Note (tanpa content) — strip biar tipenya pas.
  // belum load → rakit dari params list biar ⋮ langsung ada tanpa nunggu
  // file. info/copy yang butuh isi penuh ngisi sendiri habis load.
  // updatedAt 0 = placeholder transien, ketimpa nilai asli pas load kelar.
  const headerNote: Note | undefined = useMemo(() => {
    if (note) {
      return {
        id: note.id,
        spaceId: note.spaceId,
        title,
        preview: note.preview,
        body: note.body,
        updatedAt: note.updatedAt,
      };
    }
    if (paramTitle || paramSpaceId) {
      return {
        id: id ?? '',
        spaceId: paramSpaceId ?? '',
        title: title || paramTitle || 'Untitled',
        preview: '',
        body: '',
        updatedAt: 0,
      };
    }
    return undefined;
  }, [note, title, id, paramTitle, paramSpaceId]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <JsStack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1 }}>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !note ? (
          <View className="flex-1 items-center justify-center gap-3">
            <MaterialSymbol name="error" size={46} color={colors.mutedForeground} />
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
        ) : (
          <View style={{ flex: 1 }}>
            <TipTapEditor
              key={note.id}
              initialContent={{ type: 'doc', content: note.content } as TipTapDoc}
              title={title}
              contentTopPadding={insets.top + 78}
              onReady={(editor) => {
                editorRef.current = editor;
              }}
              onTitleChange={(t) => {
                setTitle(t);
                titleDirtyRef.current = true;
                scheduleSave(t, pendingContent.current);
              }}
              onContentChange={(doc) => {
                pendingContent.current = doc.content as NoteContent;
                scheduleSave(titleRef.current, pendingContent.current);
              }}
            />
          </View>
        )}
      </View>
      {/* header melayang di atas konten full-bleed (kayak list page):
          webview ngescroll dari belakang status bar sampe nav bar. */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <AppHeader
          variant="editor"
          onLeftPress={() => router.back()}
          onUndoPress={() => editorRef.current?.undo()}
          onRedoPress={() => editorRef.current?.redo()}
          note={headerNote}
          getEditor={() => editorRef.current}
        />
      </View>
    </View>
  );
}
