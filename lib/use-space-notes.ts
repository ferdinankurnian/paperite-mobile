// hook list notes per space dari storage (file + sqlite index).
// reload() dipanggil screen pas focus biar list selalu fresh habis edit.

import * as React from 'react';

import { type Note, type SpaceId } from '@/lib/paperite-data';
import { ensureStorageReady, listNotes } from '@/lib/storage';

export function useSpaceNotes(spaceId: SpaceId) {
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    try {
      await ensureStorageReady();
      const loaded = await listNotes(spaceId);
      setNotes(loaded);
    } catch {
      // storage gagal (misal first-run race) — jangan crash, list kosong aja.
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  React.useEffect(() => {
    // load async dari filesystem → state. ini kasus "sync external system"
    // yang valid, bukan cascading render — rule-nya false positive di sini.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { notes, loading, reload };
}
