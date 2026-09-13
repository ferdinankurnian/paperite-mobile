import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack as JsStack } from 'expo-router/js-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Note, type NoteWithContent } from '@/lib/paperite-data';
import { useColorScheme } from '@/lib/useColorScheme';
import { useSpace } from '@/lib/SpaceContext';
import { AppHeader } from '@/components/app/AppHeader';
import type { SaveStatus } from '@/components/app/SaveStatusText';
import { TipTapEditor } from '@/components/app/TipTapEditor';
import { MaterialSymbol } from '@/components/ui/MaterialSymbol';
import type { MobileEditor, TipTapDoc } from '@/lib/editor/types';
import { getCachedNote, setCachedNote } from '@/lib/note-cache';
import { createNote, ensureStorageReady, readNoteById, updateNote } from '@/lib/storage';
import type { NoteContent } from '@/lib/storage/notes';

const AUTOSAVE_DELAY = 800;
const EMPTY_DOC: TipTapDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

// SATU layar editor buat dua mode:
// - id === 'new' → mode bikin baru, LAZY: file + db row baru ditulis pas
//   user mulai ngetik. back dalam keadaan kosong = ga ninggalin sampah.
//   back selalu ke list, ga ada replace ke layar kedua.
// - id lain → mode load dari disk (cache prefetch dulu biar instan).
export default function NoteEditorScreen() {
  // judul + spaceId ikut dikirim dari list biar header + judul langsung
  // tampil tanpa nunggu baca file. dokumen full nyusul di background.
  const {
    id,
    title: paramTitle,
    spaceId: paramSpaceId,
    parentPath: paramParentPath,
  } = useLocalSearchParams<{
    id: string;
    title?: string;
    spaceId?: string;
    parentPath?: string;
  }>();
  const isNew = id === 'new';
  const { colors } = useColorScheme();
  const { activeSpaceId } = useSpace();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const editorRef = useRef<MobileEditor | null>(null);
  const [note, setNote] = useState<NoteWithContent | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [title, setTitle] = useState(paramTitle ?? '');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContent = useRef<NoteContent | null>(null);
  const titleRef = useRef(paramTitle ?? '');
  const titleDirtyRef = useRef(false);
  const noteIdRef = useRef(isNew ? '' : (id ?? ''));

  // mode new: space dikunci pas layar kebuka (dari FAB / param),
  // trash jatuh ke inbox. ga ngikutin context yang bisa berubah di tengah jalan.
  const [frozenSpace] = useState(() => {
    const raw = paramSpaceId ?? activeSpaceId;
    return raw === 'trash' || raw === 'Trash' ? 'Inbox' : raw === 'inbox' ? 'Inbox' : raw;
  });
  // parent folder dikunci juga — FAB list kirim space root, menu folder kirim path folder.
  const [frozenParent] = useState(() => paramParentPath ?? (null as string | null));
  // mode new: id asli hasil create, disimpen di state biar header re-render.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const createdIdRef = useRef<string | null>(null);
  const creatingRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // mode load: baca cache + disk. mode new: skip, langsung editor kosong
  // (loading udah false dari initial state).
  useEffect(() => {
    if (isNew) return;
    noteIdRef.current = id ?? '';
    let cancelled = false;
    (async () => {
      // cache dari prefetch (onPressIn) = render instan, ga nunggu disk.
      const cached = getCachedNote(id ?? '');
      if (cached) {
        setNote(cached);
        if (!titleDirtyRef.current) setTitle(cached.title);
        pendingContent.current = null;
        setSaveStatus('saved');
        setLoading(false);
      } else {
        setLoading(true);
      }
      await ensureStorageReady();
      const loaded = await readNoteById(id ?? '', paramSpaceId);
      if (cancelled) return;
      if (loaded) setCachedNote(loaded);
      setNote(loaded);
      // user udah ngetik judul duluan (dari params instan) → jangan timpa.
      if (loaded && !titleDirtyRef.current) {
        setTitle(loaded.title);
      } else if (!loaded && !cached) {
        setTitle(paramTitle ?? '');
      }
      pendingContent.current = null;
      setSaveStatus(loaded ? 'saved' : 'idle');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, paramTitle, paramSpaceId]);

  // mode new aja: bikin note sekali (single-flight biar back + unmount
  // yang barengan ga bikin dua file). kosong = null, ga nulis apa-apa.
  const ensureCreated = useCallback(async (): Promise<string | null> => {
    if (createdIdRef.current) return createdIdRef.current;
    if (creatingRef.current) return creatingRef.current;
    const t = titleRef.current;
    if (!t.trim() && pendingContent.current === null) return null;
    const p = (async () => {
      await ensureStorageReady();
      const made = await createNote({
        spaceId: frozenSpace,
        ...(frozenParent ? { parentPath: frozenParent } : {}),
        title: t.trim() || 'Untitled',
        content: pendingContent.current ?? [{ type: 'paragraph' }],
      }).catch(() => null);
      if (made) {
        createdIdRef.current = made.id;
        noteIdRef.current = made.id;
        setCreatedId(made.id);
        setCachedNote(made);
      }
      creatingRef.current = null;
      return createdIdRef.current;
    })();
    creatingRef.current = p;
    return p;
  }, [frozenSpace, frozenParent]);

  const scheduleSave = (nextTitle: string, nextContent: NoteContent | null) => {
    setSaveStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (isNew) {
      saveTimer.current = setTimeout(() => {
        ensureCreated().then((nid) => {
          if (!nid) {
            setSaveStatus('idle');
            return;
          }
          updateNote(nid, {
            title: nextTitle,
            ...(nextContent !== null ? { content: nextContent } : {}),
          })
            .then((saved) => {
              if (saved) {
                pendingContent.current = null;
                setCachedNote(saved);
                setSaveStatus('saved');
              } else {
                setSaveStatus('error');
              }
            })
            .catch(() => setSaveStatus('error'));
        });
      }, AUTOSAVE_DELAY);
      return;
    }
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
        setCachedNote(saved);
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    }, AUTOSAVE_DELAY);
  };

  // pin toggle dari NoteMenu (⋮) — file udah ditulis di sana,
  // sini tinggal sync state lokal + cache biar header re-render.
  const handlePinnedChange = useCallback((pinned: boolean) => {
    setNote((prev) => (prev ? { ...prev, pinned } : prev));
    const nid = noteIdRef.current;
    if (nid) {
      const cached = getCachedNote(nid);
      if (cached) setCachedNote({ ...cached, pinned });
    }
  }, []);

  const handleBack = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (isNew) {
      const t = titleRef.current;
      if (!t.trim() && pendingContent.current === null) {
        router.back();
        return;
      }
      setSaveStatus('saving');
      ensureCreated().then((nid) => {
        if (!nid) {
          router.back();
          return;
        }
        updateNote(nid, {
          title: titleRef.current,
          ...(pendingContent.current !== null ? { content: pendingContent.current } : {}),
        })
          .catch(() => undefined)
          .finally(() => {
            router.back();
          });
      });
      return;
    }
    // mode load: flush fire-and-forget, unmount effect jadi safety net.
    const nid = noteIdRef.current;
    if (nid && pendingContent.current !== null) {
      updateNote(nid, { title: titleRef.current, content: pendingContent.current }).catch(
        () => undefined
      );
      pendingContent.current = null;
    }
    router.back();
  };

  // flush pas unmount (back) biar ketikan terakhir ga hilang.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (createdIdRef.current || titleRef.current.trim() || pendingContent.current !== null) {
        if (noteIdRef.current === '' && !createdIdRef.current) {
          // mode new: id belum ada → coba create dulu.
          ensureCreated().then((nid) => {
            if (!nid) return;
            updateNote(nid, {
              title: titleRef.current,
              ...(pendingContent.current !== null ? { content: pendingContent.current } : {}),
            }).catch(() => undefined);
          });
        } else {
          const nid = noteIdRef.current;
          if (nid && pendingContent.current !== null) {
            updateNote(nid, { title: titleRef.current, content: pendingContent.current }).catch(
              () => undefined
            );
          }
        }
      }
    };
  }, [ensureCreated]);

  // identitas note buat resolve image assets → display. memo biar
  // referensinya stabil (TipTapEditor bekukan pas mount).
  // mode new: null, gambar tempelan tampil sebagai data URL apa adanya.
  const editorNoteRef = useMemo(
    () => (isNew || !note ? null : { path: note.path }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isNew, note?.id, note?.path]
  );
  // header butuh Note (tanpa content) — strip biar tipenya pas.
  // mode new: undefined sebelum kecreate (menu kesembunyiin),
  // habis kecreate rakit transien biar menu langsung ada.
  // mode load belum kelar → rakit dari params list biar ⋮ langsung ada
  // tanpa nunggu file. updatedAt 0 = placeholder transien.
  const headerNote: Note | undefined = useMemo(() => {
    if (isNew) {
      if (!createdId) return undefined;
      const parent = frozenParent ?? frozenSpace;
      return {
        id: createdId,
        spaceId: frozenSpace,
        path: `${parent}/${createdId}`,
        parentPath: parent,
        title: title || 'Untitled',
        preview: '',
        body: '',
        updatedAt: 0,
        pinned: false,
      };
    }
    if (note) {
      return {
        id: note.id,
        spaceId: note.spaceId,
        path: note.path,
        parentPath: note.parentPath,
        title,
        preview: note.preview,
        body: note.body,
        updatedAt: note.updatedAt,
        pinned: note.pinned,
      };
    }
    if (paramTitle || paramSpaceId) {
      const parent = paramParentPath ?? paramSpaceId ?? '';
      return {
        id: id ?? '',
        spaceId: paramSpaceId ?? '',
        path: parent ? `${parent}/${id ?? ''}` : (id ?? ''),
        parentPath: parent,
        title: title || paramTitle || 'Untitled',
        preview: '',
        body: '',
        updatedAt: 0,
        pinned: false,
      };
    }
    return undefined;
  }, [
    isNew,
    createdId,
    frozenSpace,
    frozenParent,
    note,
    title,
    id,
    paramTitle,
    paramSpaceId,
    paramParentPath,
  ]);

  const handleTitleChange = (t: string) => {
    setTitle(t);
    titleRef.current = t;
    if (!isNew) titleDirtyRef.current = true;
    scheduleSave(t, pendingContent.current);
  };

  const handleContentChange = (doc: TipTapDoc) => {
    pendingContent.current = doc.content as NoteContent;
    scheduleSave(titleRef.current, pendingContent.current);
  };

  const handleEditorReady = (editor: MobileEditor) => {
    editorRef.current = editor;
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <JsStack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1 }}>
        {isNew ? (
          <View style={{ flex: 1 }}>
            <TipTapEditor
              autofocusTitle
              initialContent={EMPTY_DOC}
              title={title}
              noteRef={null}
              contentTopPadding={insets.top + 78}
              placeholder="Start writing..."
              onReady={handleEditorReady}
              onTitleChange={handleTitleChange}
              onContentChange={handleContentChange}
            />
          </View>
        ) : loading ? (
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
              noteRef={editorNoteRef}
              contentTopPadding={insets.top + 78}
              onReady={handleEditorReady}
              onTitleChange={handleTitleChange}
              onContentChange={handleContentChange}
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
          onLeftPress={handleBack}
          onUndoPress={() => editorRef.current?.undo()}
          onRedoPress={() => editorRef.current?.redo()}
          note={headerNote}
          getEditor={() => editorRef.current}
          onPinnedChange={handlePinnedChange}
          saveStatus={saveStatus}
        />
      </View>
    </View>
  );
}
