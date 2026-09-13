// facade storage — UI cuma import dari sini, jangan dari submodul langsung.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDb } from './db';
import { ensureWorkspace, LEGACY_INBOX_ID, LEGACY_TRASH_ID } from './files';
import { migrateSlugSpaces } from './spaces';
import { ensureSeeded } from './seed';

export { listSpaces, addSpaceFolder, renameSpace } from './spaces';
export {
  createNote,
  createNoteWithId,
  deleteNoteToTrash,
  findNotePathById,
  listNotes,
  listSpaceTree,
  readNoteById,
  readNoteByPath,
  reindexAll,
  searchNotes,
  setNotePinned,
  updateNote,
} from './notes';
export {
  collectNotePaths,
  createFolder,
  deleteItemToTrash,
  emptyTrash,
  listTrash,
  moveItem,
  permanentDeleteTrashItem,
  renameItem,
  restoreTrashItem,
  type TrashNote,
} from './folders';
export { readAppState, writeAppState } from './state';
export { htmlToText } from './note-format';

const ACTIVE_SPACE_KEY = 'paperite:active-space';

let ready: Promise<void> | null = null;

/** siapin workspace + migrasi + db. idempotent, aman dipanggil berkali-kali. */
export function ensureStorageReady(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      ensureWorkspace();
      getDb();
      // migrasi layout lama → 1:1 desktop. remap active-space + db space.
      const renamed = await migrateSlugSpaces().catch(() => new Map<string, string>());
      if (renamed.size > 0) {
        try {
          const saved = await AsyncStorage.getItem(ACTIVE_SPACE_KEY);
          if (saved && renamed.has(saved)) {
            await AsyncStorage.setItem(ACTIVE_SPACE_KEY, renamed.get(saved) as string);
          }
        } catch {
          // abaikan
        }
      } else {
        // remap lowercase legacy meski ga ada slug (dir udah ke-merge duluan)
        try {
          const saved = await AsyncStorage.getItem(ACTIVE_SPACE_KEY);
          if (saved === LEGACY_INBOX_ID) await AsyncStorage.setItem(ACTIVE_SPACE_KEY, 'Inbox');
          else if (saved === LEGACY_TRASH_ID) await AsyncStorage.setItem(ACTIVE_SPACE_KEY, 'Trash');
        } catch {
          // abaikan
        }
        try {
          const database = getDb();
          database.runSync(
            'UPDATE notes SET spaceId = ? WHERE spaceId = ?',
            'Inbox',
            LEGACY_INBOX_ID
          );
          database.runSync(
            'UPDATE notes SET spaceId = ? WHERE spaceId = ?',
            'Trash',
            LEGACY_TRASH_ID
          );
        } catch {
          // abaikan
        }
      }
      await ensureSeeded();
    })();
  }
  return ready;
}
