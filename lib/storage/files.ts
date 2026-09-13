// low-level filesystem: workspace private di app sandbox.
// android: /data/data/com.avaidstudio.paperite/files/Paperite/
// (Paths.document — ga keliatan di file manager, ga butuh permission)
// ios: app sandbox Documents/Paperite/.
// bekapan aman karena bukan cache — system ga akan hapus sendiri.
//
// layout disk 1:1 sama desktop (~/Projects/paperite, server/lib/workspace.js):
//   <root>/Inbox/               # space default (kapital, case-sensitive!)
//   <root>/Trash/               # reserved + .trash-meta.json single-file
//   <root>/<Space>/             # space = direktori level-1 biasa
//     <uuid>/note.json+assets/  # note = dir isi note.json
//     <Folder>/...              # folder = dir BIASA tanpa note.json, rekursif
//   <root>/.paperite/state.json # app-state (icon/color/expand/...)
// path selalu posix relatif: "Riset/Meeting/<uuid>", folder "Riset/Meeting".

import { Directory, File, Paths } from 'expo-file-system';

export const WORKSPACE_DIRNAME = 'Paperite';
export const NOTE_FILENAME = 'note.json';
export const ASSETS_DIRNAME = 'assets';
export const META_DIRNAME = '.paperite';
export const SPACES_META_FILENAME = 'spaces.json';
export const STATE_FILENAME = 'state.json';
export const TRASH_DIRNAME = 'Trash';
// id = nama direktori di disk, 1:1 sama desktop (kapital).
export const INBOX_ID = 'Inbox';
export const TRASH_ID = 'Trash';
// id lama (lowercase) — cuma buat migrasi sekali jalan.
export const LEGACY_INBOX_ID = 'inbox';
export const LEGACY_TRASH_ID = 'trash';
export const TRASH_META_FILENAME = '.trash-meta.json';

export function workspaceRoot(): Directory {
  return new Directory(Paths.document, WORKSPACE_DIRNAME);
}

export function spaceDir(spaceId: string): Directory {
  return new Directory(workspaceRoot(), spaceId);
}

export function noteDir(spaceId: string, noteId: string): Directory {
  return new Directory(spaceDir(spaceId), noteId);
}

export function noteFile(spaceId: string, noteId: string): File {
  return new File(noteDir(spaceId, noteId), NOTE_FILENAME);
}

export function metaFile(): File {
  return new File(workspaceRoot(), META_DIRNAME, SPACES_META_FILENAME);
}

export function stateFile(): File {
  return new File(workspaceRoot(), META_DIRNAME, STATE_FILENAME);
}

export function trashMetaFile(): File {
  return new File(dirForRel(TRASH_ID), TRASH_META_FILENAME);
}

// ---- posix path utils (mirror desktop normalizeRelativePath, tanpa dep node:path) ----

/** "a//b/./c" → "a/b/c", ".." pop, absolute/leading-dot disikat. */
export function normalizeRel(p: string): string {
  const out: string[] = [];
  for (const part of p.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join('/');
}

export function joinPosix(...segs: string[]): string {
  return normalizeRel(segs.join('/'));
}

export function dirnamePosix(p: string): string {
  const n = normalizeRel(p);
  const i = n.lastIndexOf('/');
  return i < 0 ? '' : n.slice(0, i);
}

export function basenamePosix(p: string): string {
  const n = normalizeRel(p);
  const i = n.lastIndexOf('/');
  return i < 0 ? n : n.slice(i + 1);
}

/** true kalau child === parent atau di dalamnya ("a" vs "a/b"). */
export function isDescendantPath(parent: string, child: string): boolean {
  const p = normalizeRel(parent);
  const c = normalizeRel(child);
  if (!p) return true;
  return c === p || c.startsWith(`${p}/`);
}

/** workspace-relative posix → Directory. '' = root. */
export function dirForRel(rel: string): Directory {
  const n = normalizeRel(rel);
  if (!n) return workspaceRoot();
  return new Directory(workspaceRoot(), ...n.split('/'));
}

/** workspace-relative posix → File. */
export function fileForRel(rel: string): File {
  const n = normalizeRel(rel);
  const parts = n.split('/');
  const name = parts.pop() as string;
  return new File(dirForRel(parts.join('/')), name);
}

export function noteDirByPath(notePath: string): Directory {
  return dirForRel(notePath);
}

export function noteFileByPath(notePath: string): File {
  return new File(dirForRel(notePath), NOTE_FILENAME);
}

export function isNoteDirSync(dir: Directory): boolean {
  try {
    return new File(dir, NOTE_FILENAME).exists;
  } catch {
    return false;
  }
}

/**
 * path unik di dalam parent (mirror desktop uniquePath):
 * "Meeting" → "Meeting 1" → "Meeting 2" kalau tabrakan.
 */
export function uniqueChildPath(parentRel: string, name: string): string {
  const parent = normalizeRel(parentRel);
  const trimmed = name.trim() || 'Untitled';
  let candidate = trimmed;
  let i = 1;
  while (
    dirForRel(joinPosix(parent, candidate)).exists ||
    fileForRel(joinPosix(parent, candidate)).exists
  ) {
    candidate = `${trimmed} ${i}`;
    i += 1;
  }
  return parent ? `${parent}/${candidate}` : candidate;
}

/** uuid v4 penuh 1:1 sama desktop (crypto.randomUUID). fallback skema lama. */
export function newNoteUuid(): string {
  try {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  } catch {
    // abaikan, fallback di bawah
  }
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureDir(dir: Directory) {
  if (!dir.exists) {
    dir.create();
  }
}

export function ensureWorkspace() {
  const root = workspaceRoot();
  ensureDir(root);
  ensureDir(new Directory(root, META_DIRNAME));
  ensureDir(new Directory(root, INBOX_ID));
  ensureDir(new Directory(root, TRASH_DIRNAME));
}

/**
 * migrasi sekali jalan dari layout lama (lowercase inbox/trash):
 * pindahin isi ke Inbox/Trash kapital. db + prefs diurus seed.
 */
export async function migrateLegacyCaseDirs(): Promise<void> {
  ensureWorkspace();
  await migrateOneCaseDir(LEGACY_INBOX_ID, INBOX_ID);
  await migrateOneCaseDir(LEGACY_TRASH_ID, TRASH_ID);
}

async function migrateOneCaseDir(fromId: string, toId: string): Promise<void> {
  if (fromId === toId) return;
  const from = dirForRel(fromId);
  let to = dirForRel(toId);
  try {
    if (!from.exists) return;
  } catch {
    return;
  }
  try {
    if (!to.exists) {
      // rename langsung — kasus umum (fresh migrate, ga ada tabrakan).
      await from.move(to);
      return;
    }
    // dua-duanya ada (adb push campur) → merge per entry.
    for (const entry of from.list()) {
      if (!(entry instanceof Directory)) continue;
      if (entry.name.startsWith('.')) continue;
      try {
        const destRel = uniqueChildPath(toId, entry.name);
        to = dirForRel(toId);
        if (!to.exists) to.create();
        await entry.move(dirForRel(destRel));
      } catch {
        // satu entry gagal = skip, jangan matiin migrasi
      }
    }
    // kosong → buang dir lamanya
    try {
      if (from.exists && from.list().length === 0) from.delete();
    } catch {
      // abaikan
    }
  } catch {
    // migrasi best-effort, ga boleh crash cold start
  }
}

/** folder space: semua direktori top-level kecuali .paperite + Trash. */
export function scanSpaceIds(): string[] {
  const root = workspaceRoot();
  if (!root.exists) return [];
  const ids: string[] = [];
  for (const entry of root.list()) {
    if (!(entry instanceof Directory)) continue;
    const name = entry.name;
    if (name.startsWith('.') || name === TRASH_DIRNAME) continue;
    ids.push(name);
  }
  return ids.sort();
}

/** semua note dir id dalam satu space — FLAT top-level aja (legacy).
 *  kode baru harusnya pake scanRecursive dari notes.ts. */
export function scanNoteIds(spaceId: string): string[] {
  const dir = spaceDir(spaceId);
  if (!dir.exists) return [];
  const ids: string[] = [];
  for (const entry of dir.list()) {
    if (!(entry instanceof Directory)) continue;
    if (entry.name.startsWith('.')) continue;
    if (new File(entry, NOTE_FILENAME).exists) ids.push(entry.name);
  }
  return ids;
}

export async function readJsonFile<T>(file: File): Promise<T | null> {
  try {
    if (!file.exists) return null;
    const raw = await file.text();
    if (!raw.trim()) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJsonFile(file: File, value: unknown) {
  const parent = file.parentDirectory;
  if (parent && !parent.exists) {
    parent.create({ intermediates: true });
  }
  if (!file.exists) {
    file.create();
  }
  file.write(JSON.stringify(value, null, 2));
}

export function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'untitled';
}

export function newNoteId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `n-${Date.now().toString(36)}-${rand}`;
}
