// siapin workspace private baru: folder standar + db + reindex.
// ga ada seed demo — fresh install = Inbox kosong. data demo lama udah
// dicabut biar test persistence beneran bersih.

import { getDb } from './db';
import { ensureWorkspace } from './files';
import { reindexAll } from './notes';

let ready: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      ensureWorkspace();
      // init db duluan biar tabel siap sebelum reindex.
      getDb();
      // reconcile tiap cold start: file hasil adb push dari desktop langsung
      // ke-index, ghost row ke-prune. workspace kecil jadi ini murah.
      await reindexAll();
    })();
  }
  return ready;
}
