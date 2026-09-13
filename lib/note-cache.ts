// cache note full-content di memori biar open dari list ga nunggu disk.
// diisi via prefetch (onPressIn / item kebaca), dibaca duluan sama note/[id].
// invalidasi: updateNote/createNote nulis ulang entry, list reload ga perlu hapus.

import type { NoteWithContent } from '@/lib/paperite-data';
import { ensureStorageReady, readNoteById } from '@/lib/storage';

const cache = new Map<string, NoteWithContent>();
const inFlight = new Set<string>();

export function getCachedNote(id: string): NoteWithContent | undefined {
  return cache.get(id);
}

export function setCachedNote(note: NoteWithContent) {
  cache.set(note.id, note);
  // jangan gondrong: 30 note terakhir cukup buat back-and-forth.
  if (cache.size > 30) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

export function dropCachedNote(id: string) {
  cache.delete(id);
}

/** best-effort, ga pernah throw. dipanggil dari list pas PressIn. */
export function prefetchNote(id: string, spaceId?: string) {
  if (!id || cache.has(id) || inFlight.has(id)) return;
  inFlight.add(id);
  (async () => {
    try {
      await ensureStorageReady();
      const note = await readNoteById(id, spaceId);
      if (note) setCachedNote(note);
    } catch {
      // prefetch gagal = biarin, note page bakal load normal.
    } finally {
      inFlight.delete(id);
    }
  })();
}
