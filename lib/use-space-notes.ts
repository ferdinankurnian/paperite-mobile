// hook list notes per space dari storage (file + sqlite index).
// reload() dipanggil screen pas focus biar list selalu fresh habis edit.

import * as React from 'react';

import { type Note, type SpaceId, type WorkspaceItem } from '@/lib/paperite-data';
import {
  ensureStorageReady,
  listNotes,
  listSpaceTree,
  listTrash,
  type TrashNote,
} from '@/lib/storage';

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

/** tree folders + notes per space (scan disk rekursif, 1:1 desktop). */
export function useSpaceTree(spaceId: SpaceId, enabled = true) {
  const [tree, setTree] = React.useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    if (!enabled) {
      setTree([]);
      setLoading(false);
      return;
    }
    try {
      await ensureStorageReady();
      const loaded = await listSpaceTree(spaceId);
      setTree(loaded);
    } catch {
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, [spaceId, enabled]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { tree, loading, reload };
}

/** isi trash (flat, newest dulu — desktop ga ada folder di trash). */
export function useTrashNotes(active: boolean) {
  const [items, setItems] = React.useState<TrashNote[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    if (!active) return;
    try {
      await ensureStorageReady();
      setItems(await listTrash());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [active]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { items, loading, reload };
}
