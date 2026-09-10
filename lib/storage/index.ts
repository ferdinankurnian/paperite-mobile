// facade storage — UI cuma import dari sini, jangan dari submodul langsung.

import { ensureSeeded } from './seed';

export { listSpaces, addSpaceFolder } from './spaces';
export {
  createNote,
  deleteNoteToTrash,
  listNotes,
  readNoteById,
  reindexAll,
  searchNotes,
  updateNote,
} from './notes';
export { htmlToText } from './note-format';

let ready: Promise<void> | null = null;

/** siapin workspace + seed + db. idempotent, aman dipanggil berkali-kali. */
export function ensureStorageReady(): Promise<void> {
  if (!ready) {
    ready = ensureSeeded().then(() => undefined);
  }
  return ready;
}
