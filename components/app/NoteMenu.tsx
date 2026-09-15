import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import type { MobileEditor } from '@/lib/editor/types';

import { ToolbarMenu, type ToolbarMenuEntry } from '@/components/ui/ToolbarMenu';
import { formatNoteDate, type Note } from '@/lib/paperite-data';
import { useSpace } from '@/lib/SpaceContext';
import { deleteNoteToTrash, ensureStorageReady, setNotePinned } from '@/lib/storage';

type NoteMenuProps = {
  note: Note;
  getEditor: () => MobileEditor | null;
  /** dipanggil habis pin toggle sukses biar screen bisa update state lokal. */
  onPinnedChange?: (pinned: boolean) => void;
};

/**
 * parity sama dropdown desktop (`note-header.tsx` di paperite web):
 * Note Info / Note setup... / Copy as > / Export as > / Find / Replace / Delete.
 *
 * yang sengaja beda:
 * - "Pop out note" nggak ada — itu windowing desktop (electron), meaningless di mobile.
 * - submenu dibikin accordion inline, bukan panel ngambang kedua (nggak ada
 *   positioning hell di layar kecil).
 * - item yang backend-nya belum ada (store beneran, markdown serializer,
 *   file share, editor search) di-disabled dulu, bukan fake handler.
 *   cari TODO(ID) di bawah buat tau apa yang kurang.
 */
export function NoteMenu({ note, getEditor, onPinnedChange }: NoteMenuProps) {
  const { spaces } = useSpace();
  const space = spaces.find((s) => s.id === note.spaceId);

  const showInfo = () => {
    Alert.alert(
      note.title || 'Untitled',
      `space: ${space?.name ?? note.spaceId}\nupdated: ${formatNoteDate(note.updatedAt)}\n\n${note.preview}`
    );
  };

  const confirmDelete = () => {
    Alert.alert('Delete note?', `"${note.title || 'Untitled'}" will be moved to Trash.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteNoteToTrash(note.id).catch(() => false);
          if (ok) {
            router.back();
          } else {
            Alert.alert('Delete failed', 'Please try again.');
          }
        },
      },
    ]);
  };

  const copyPlainText = async () => {
    try {
      const editor = getEditor();
      // judul dari TextInput lokal, body dari bridge — gabung kayak desktop.
      const body = editor ? await editor.getText() : note.body;
      await Clipboard.setStringAsync(`${note.title}\n\n${body}`);
    } catch {
      Alert.alert('Copy failed', 'Please try again.');
    }
  };

  const togglePin = async () => {
    try {
      await ensureStorageReady();
      const updated = await setNotePinned(note.id, !note.pinned);
      if (updated) onPinnedChange?.(updated.pinned);
      else Alert.alert('Pin failed', 'Please try again.');
    } catch {
      Alert.alert('Pin failed', 'Please try again.');
    }
  };

  const entries: ToolbarMenuEntry[] = [
    { title: 'Note Info', icon: 'info', onPress: showInfo },
    // 1:1 desktop sidebar: Pin/Unpin note (scope per parent folder).
    { title: note.pinned ? 'Unpin' : 'Pin to top', icon: 'push_pin', onPress: togglePin },
    // TODO(mobile-store): note setup (line height / spacing / indent) — butuh
    // settings section + persist, desktop ada di settings-dialog "Note".
    { title: 'Note setup...', disabled: true },
    { type: 'separator' },
    {
      type: 'submenu',
      title: 'Copy as...',
      children: [
        { title: 'Plain text', onPress: copyPlainText },
        // TODO(mobile-md): butuh html→markdown serializer (desktop pake tiptap).
        // jangan fake: copy html mentah sebagai "markdown" itu bohong.
        { title: 'Markdown', disabled: true },
      ],
    },
    {
      type: 'submenu',
      title: 'Export as...',
      children: [
        // TODO(mobile-share): file di disk udah ada (note.json), tinggal
        // expo-sharing buat share .md/.txt. belum di-install.
        { title: 'Markdown (.md)', disabled: true },
        { title: 'Plain Text (.txt)', disabled: true },
      ],
    },
    { type: 'separator' },
    // TODO(mobile-search): webview bridge belum expose find/replace. butuh
    // search UI + pesan bridge sendiri sebelum ini bisa nyala.
    { title: 'Find in note...', icon: 'search', disabled: true },
    { title: 'Replace in note...', disabled: true },
    { type: 'separator' },
    // trash ada beneran sekarang (folder Trash di workspace private).
    // restore + empty trash nyusul — trash screen belum ada.
    { title: 'Delete note', icon: 'delete', destructive: true, onPress: confirmDelete },
  ];

  return <ToolbarMenu entries={entries} accessibilityLabel="Note actions" />;
}
