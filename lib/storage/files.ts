// low-level filesystem: workspace private di app sandbox.
// android: /data/data/com.avaidstudio.paperite/files/Paperite/
// (Paths.document — ga keliatan di file manager, ga butuh permission)
// ios: app sandbox Documents/Paperite/.
// bekapan aman karena bukan cache — system ga akan hapus sendiri.

import { Directory, File, Paths } from 'expo-file-system';

export const WORKSPACE_DIRNAME = 'Paperite';
export const NOTE_FILENAME = 'note.json';
export const ASSETS_DIRNAME = 'assets';
export const META_DIRNAME = '.paperite';
export const SPACES_META_FILENAME = 'spaces.json';
export const TRASH_DIRNAME = 'Trash';
export const INBOX_ID = 'inbox';
export const TRASH_ID = 'trash';

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

/** semua note dir id dalam satu space (folder yang ada note.json). */
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
