// spaces = folder top-level di workspace. meta (nama display, icon, color)
// disimpen di .paperite/spaces.json biar folder di disk tetap slug yang stabil.

import type { Space } from '@/lib/paperite-data';
import { SPACE_COLORS } from '@/lib/space-options';
import {
  ensureWorkspace,
  INBOX_ID,
  metaFile,
  readJsonFile,
  scanSpaceIds,
  slugify,
  spaceDir,
  TRASH_ID,
  writeJsonFile,
} from './files';

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

async function readMeta(): Promise<SpacesMetaFile> {
  const parsed = await readJsonFile<SpacesMetaFile>(metaFile());
  if (parsed && Array.isArray(parsed.spaces)) return parsed;
  return { spaces: [] };
}

function writeMeta(meta: SpacesMetaFile) {
  writeJsonFile(metaFile(), meta);
}

function toSpace(id: string, metaById: Map<string, SpaceMeta>): Space {
  const system = SYSTEM_META[id];
  const meta = metaById.get(id);
  if (system) {
    return { id, name: system.name, icon: system.icon, kind: 'system' };
  }
  const name = meta?.name ?? id;
  return {
    id,
    name,
    icon: meta?.icon ?? 'folder',
    kind: 'space',
    ...(meta?.color ? { color: meta.color } : {}),
  };
}

export async function listSpaces(): Promise<Space[]> {
  ensureWorkspace();
  const meta = await readMeta();
  const metaById = new Map(meta.spaces.map((s) => [s.id, s]));
  const ids = scanSpaceIds();
  // inbox selalu ada; trash selalu ditampilin walau foldernya di-exclude dari scan.
  const ordered = [INBOX_ID, ...ids.filter((id) => id !== INBOX_ID), TRASH_ID];
  return ordered.map((id) => toSpace(id, metaById));
}

export async function addSpaceFolder(
  name: string,
  icon = 'folder',
  color: string = SPACE_COLORS[0]
): Promise<Space> {
  ensureWorkspace();
  const trimmed = name.trim();
  const base = slugify(trimmed);
  let id = `${base}-${Date.now().toString(36)}`;
  // hindari tabrakan folder (kecil kemungkinan, tapi murah dicek).
  const existing = new Set(scanSpaceIds());
  while (existing.has(id)) {
    id = `${base}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
  }
  const dir = spaceDir(id);
  if (!dir.exists) dir.create();

  const meta = await readMeta();
  meta.spaces.push({ id, name: trimmed, icon, color });
  writeMeta(meta);

  return { id, name: trimmed, icon, kind: 'space', color };
}
