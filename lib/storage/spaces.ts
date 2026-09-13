// spaces = direktori top-level di workspace (1:1 desktop: nama dir = judul).
// icon/color/order disimpen di .paperite/state.json (key spaceIcons/
// spaceColors/spaceOrder) biar desktop ikut baca. spaces.json lama cuma
// dibaca sekali buat migrasi, habis itu ditulis juga biar rollback aman.

import { getDb } from './db';
import {
  basenamePosix,
  dirForRel,
  ensureWorkspace,
  INBOX_ID,
  joinPosix,
  metaFile,
  normalizeRel,
  readJsonFile,
  scanSpaceIds,
  TRASH_ID,
  uniqueChildPath,
  writeJsonFile,
} from './files';
import type { Space } from '@/lib/paperite-data';
import { SPACE_COLORS } from '@/lib/space-options';
import { readAppState, writeAppState } from './state';

export type SpaceMeta = {
  id: string;
  name: string;
  icon: string;
  color?: string;
};

type SpacesMetaFile = {
  spaces: SpaceMeta[];
};

const SYSTEM_META: Record<string, { name: string; icon: string }> = {
  [INBOX_ID]: { name: 'Inbox', icon: 'inbox' },
  [TRASH_ID]: { name: 'Trash', icon: 'trash' },
};

async function readLegacyMeta(): Promise<SpacesMetaFile> {
  const parsed = await readJsonFile<SpacesMetaFile>(metaFile());
  if (parsed && Array.isArray(parsed.spaces)) return parsed;
  return { spaces: [] };
}

function writeLegacyMeta(meta: SpacesMetaFile) {
  writeJsonFile(metaFile(), meta);
}

function sanitizeSpaceName(name: string): string {
  return name.trim().replace(/\//g, '-').replace(/\\/g, '-') || 'Untitled';
}

/**
 * migrasi space lama (id slug "riset-k3j..." + display name di spaces.json)
 * ke layout desktop (dir = judul literal). jalan sekali tiap cold start,
 * no-op kalau udah literal.
 */
export async function migrateSlugSpaces(): Promise<Map<string, string>> {
  ensureWorkspace();
  const renamed = new Map<string, string>();
  const legacy = await readLegacyMeta();
  if (legacy.spaces.length === 0) return renamed;

  const onDisk = new Set(scanSpaceIds());
  const nextMeta: SpaceMeta[] = [];
  let metaChanged = false;

  for (const m of legacy.spaces) {
    const oldId = normalizeRel(m.id);
    if (!oldId || !onDisk.has(oldId)) {
      nextMeta.push(m);
      continue;
    }
    const targetBase = sanitizeSpaceName(m.name || oldId);
    // udah literal (id == nama) → ga usah apa-apa
    if (oldId === targetBase) {
      nextMeta.push({ ...m, id: oldId, name: targetBase });
      continue;
    }
    // slug lama → rename dir ke judul literal (dedup kalau tabrakan)
    const destRel = uniqueChildPath('', targetBase);
    try {
      const notes = await collectChildNoteIds(oldId);
      await dirForRel(oldId).move(dirForRel(destRel));
      rewriteDbSpace(oldId, destRel, notes);
      renamed.set(oldId, destRel);
      onDisk.delete(oldId);
      onDisk.add(destRel);
      nextMeta.push({ ...m, id: destRel, name: basenamePosix(destRel) });
      metaChanged = true;
    } catch {
      nextMeta.push(m);
    }
  }
  if (metaChanged) writeLegacyMeta({ spaces: nextMeta });

  // import icon/color legacy yang belum ada di state.json
  if (renamed.size > 0 || legacy.spaces.length > 0) {
    const state = await readAppState();
    const icons = { ...state.spaceIcons };
    const colors = { ...state.spaceColors };
    let changed = false;
    for (const m of nextMeta) {
      const key = renamed.get(m.id) ?? m.id;
      if (m.icon && !icons[key]) {
        icons[key] = m.icon;
        changed = true;
      }
      if (m.color && !colors[key]) {
        colors[key] = m.color;
        changed = true;
      }
    }
    if (changed) await writeAppState({ spaceIcons: icons, spaceColors: colors });
  }
  return renamed;
}

async function collectChildNoteIds(spaceId: string): Promise<string[]> {
  // db-side aja (murah); path rewrite diurus rewriteDbSpace by prefix.
  try {
    const rows = getDb().getAllSync<{ id: string }>(
      'SELECT id FROM notes WHERE spaceId = ?',
      spaceId
    );
    return rows.map((r) => r.id);
  } catch {
    return [];
  }
}

function rewriteDbSpace(oldSpace: string, newSpace: string, _ids: string[]) {
  try {
    const database = getDb();
    const rows = database.getAllSync<{ id: string; path: string; parentPath: string }>(
      'SELECT id, path, parentPath FROM notes WHERE spaceId = ?',
      oldSpace
    );
    for (const r of rows) {
      const oldPrefix = `${oldSpace}/`;
      const newPath = r.path.startsWith(oldPrefix)
        ? `${newSpace}/${r.path.slice(oldPrefix.length)}`
        : `${newSpace}/${r.id}`;
      const i = newPath.lastIndexOf('/');
      const newParent = i < 0 ? newSpace : newPath.slice(0, i);
      database.runSync(
        'UPDATE notes SET spaceId = ?, path = ?, parentPath = ? WHERE id = ?',
        newSpace,
        newPath,
        newParent,
        r.id
      );
    }
  } catch {
    // best-effort; reindex yang beresin sisanya
  }
}

function toSpace(id: string, icons: Record<string, string>, colors: Record<string, string>): Space {
  const system = SYSTEM_META[id];
  if (system) {
    return { id, name: system.name, icon: system.icon, kind: 'system' };
  }
  return {
    id,
    name: id,
    icon: icons[id] ?? 'folder',
    kind: 'space',
    ...(colors[id] ? { color: colors[id] } : {}),
  };
}

export async function listSpaces(): Promise<Space[]> {
  ensureWorkspace();
  const state = await readAppState();
  const ids = scanSpaceIds();
  // order: Inbox dulu, terus spaceOrder desktop (kalau ada), sisa alpha, Trash paling bawah.
  const orderedIds = ids.filter((id) => id !== INBOX_ID);
  const rank = new Map(state.spaceOrder.map((id, i) => [id, i]));
  orderedIds.sort((a, b) => (rank.get(a) ?? 1e9) - (rank.get(b) ?? 1e9) || a.localeCompare(b));
  const ordered = [INBOX_ID, ...orderedIds, TRASH_ID];
  return ordered.map((id) => toSpace(id, state.spaceIcons, state.spaceColors));
}

export async function addSpaceFolder(
  name: string,
  icon = 'folder',
  color: string = SPACE_COLORS[0]
): Promise<Space> {
  ensureWorkspace();
  const title = sanitizeSpaceName(name);
  if (title === TRASH_ID) throw new Error('Trash is reserved');
  const id = uniqueChildPath('', title);
  const dir = dirForRel(id);
  if (!dir.exists) dir.create();

  await writeAppState({
    spaceIcons: { [id]: icon },
    spaceColors: { [id]: color },
  });
  // legacy mirror biar downgrade ga kehilangan nama
  const legacy = await readLegacyMeta();
  legacy.spaces.push({ id, name: basenamePosix(id), icon, color });
  writeLegacyMeta(legacy);

  return { id, name: basenamePosix(id), icon, kind: 'space', color };
}

/** rename space = rename dir (mirror desktop rename folder). */
export async function renameSpace(spaceId: string, nextName: string): Promise<Space> {
  const current = normalizeRel(spaceId);
  if (!current || current === INBOX_ID || current === TRASH_ID) {
    throw new Error('cannot rename system space');
  }
  const title = sanitizeSpaceName(nextName);
  const destRel = joinPosix('', title);
  if (destRel === current) {
    const state = await readAppState();
    return toSpace(current, state.spaceIcons, state.spaceColors);
  }
  if (dirForRel(destRel).exists) throw new Error('name already exists');
  await dirForRel(current).move(dirForRel(destRel));
  rewriteDbSpace(current, destRel, []);
  // pindahin icon/color key ikut path baru
  const state = await readAppState();
  const icons = { ...state.spaceIcons };
  const colors = { ...state.spaceColors };
  if (icons[current]) {
    icons[destRel] = icons[current];
    delete icons[current];
  }
  if (colors[current]) {
    colors[destRel] = colors[current];
    delete colors[current];
  }
  const order = state.spaceOrder.map((id) => (id === current ? destRel : id));
  await writeAppState({ spaceIcons: icons, spaceColors: colors, spaceOrder: order });
  const legacy = await readLegacyMeta();
  writeLegacyMeta({
    spaces: legacy.spaces.map((m) =>
      m.id === current ? { ...m, id: destRel, name: basenamePosix(destRel) } : m
    ),
  });
  return toSpace(destRel, icons, colors);
}
