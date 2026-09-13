// folder ops 1:1 sama desktop (server/routes/workspace.js + notes.js DELETE):
// folder = direktori biasa tanpa note.json, rekursif. note rename = edit
// title di json (dir ga pindah). folder/space rename/move = pindah dir.
// delete = tiap note child dipindah ke Trash/<uuid>/ + meta single-file,
// baru sisa dir kosong dihapus. jangan rm langsung.

import { Directory, File } from 'expo-file-system';

import type { Note } from '@/lib/paperite-data';
import { getDb, removeNoteRow, upsertNoteRow } from './db';
import {
  basenamePosix,
  dirForRel,
  dirnamePosix,
  fileForRel,
  isDescendantPath,
  isNoteDirSync,
  joinPosix,
  normalizeRel,
  noteFileByPath,
  readJsonFile,
  TRASH_ID,
  trashMetaFile,
  uniqueChildPath,
  writeJsonFile,
} from './files';
import { docPreview, docToText, type NoteDoc } from './note-format';

export type TrashMetaEntry = {
  originalPath: string;
  deletedAt: number;
};

export type TrashMeta = Record<string, TrashMetaEntry>;

export type TrashNote = {
  title: string;
  trashPath: string;
  originalPath: string;
  deletedAt: number;
  preview: string;
};

/** space = segmen pertama path ("Riset/Meeting/<uuid>" → "Riset"). */
export function spaceOfPath(path: string): string {
  const n = normalizeRel(path);
  const i = n.indexOf('/');
  return i < 0 ? n : n.slice(0, i);
}

async function readNoteDocByPath(notePath: string): Promise<NoteDoc | null> {
  return readJsonFile<NoteDoc>(noteFileByPath(notePath));
}

function toNote(notePath: string, doc: NoteDoc): Note {
  const body = docToText(doc);
  const parentPath = dirnamePosix(notePath);
  return {
    id: basenamePosix(notePath),
    spaceId: spaceOfPath(notePath),
    path: normalizeRel(notePath),
    parentPath,
    title: doc.title || 'Untitled',
    preview: docPreview(doc) || body.split('\n')[0]?.trim() || '',
    body,
    updatedAt: doc.updatedAt,
    pinned: doc.pinned === true,
  };
}

// ---- trash meta (single file Trash/.trash-meta.json, 1:1 desktop) ----

export async function readTrashMeta(): Promise<TrashMeta> {
  const parsed = await readJsonFile<TrashMeta>(trashMetaFile());
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  return {};
}

function writeTrashMeta(meta: TrashMeta) {
  writeJsonFile(trashMetaFile(), meta);
}

/**
 * migrasi meta lama mobile (per-dir Trash/<id>/.trash-meta.json isi
 * {originalSpaceId, deletedAt}) ke format desktop single-file.
 * originalPath direkonstruksi "spaceId/id" — cukup buat restore.
 */
export async function migrateLegacyPerDirTrashMetas(): Promise<void> {
  try {
    const trashDir = dirForRel(TRASH_ID);
    if (!trashDir.exists) return;
    const meta = await readTrashMeta();
    let changed = false;
    for (const entry of trashDir.list()) {
      if (!(entry instanceof Directory)) continue;
      const name = entry.name;
      if (name.startsWith('.')) continue;
      if (meta[name]) continue;
      const legacy = await readJsonFile<{ originalSpaceId?: string; deletedAt?: number }>(
        new File(entry, '.trash-meta.json')
      );
      if (legacy?.originalSpaceId) {
        meta[name] = {
          originalPath: joinPosix(legacy.originalSpaceId, name),
          deletedAt: typeof legacy.deletedAt === 'number' ? legacy.deletedAt : Date.now(),
        };
        changed = true;
      }
      // file legacy selalu dibuang — desktop cuma baca single-file
      try {
        const f = new File(entry, '.trash-meta.json');
        if (f.exists) f.delete();
      } catch {
        // abaikan
      }
    }
    if (changed) writeTrashMeta(meta);
  } catch {
    // best-effort
  }
}

// ---- create ----

/** bikin folder di dalam parent (space / folder). dedup "Nama 1" ala desktop. */
export function createFolder(parentPath: string, title: string): { path: string; title: string } {
  const parent = normalizeRel(parentPath);
  if (!parent) throw new Error('parent required');
  if (spaceOfPath(parent) === TRASH_ID) throw new Error('cannot create inside Trash');
  const path = uniqueChildPath(parent, title);
  const dir = dirForRel(path);
  if (!dir.exists) dir.create();
  return { path, title: basenamePosix(path) };
}

// ---- collect ----

/** semua note-dir di bawah path (inklusif kalau path-nya note sendiri). */
export function collectNotePaths(itemPath: string): string[] {
  const rel = normalizeRel(itemPath);
  if (!rel) return [];
  const out: string[] = [];
  const walk = (dir: Directory, dirRel: string) => {
    let entries: (Directory | File)[];
    try {
      entries = dir.list();
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (!(entry instanceof Directory)) continue;
      const childRel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
      if (isNoteDirSync(entry)) {
        out.push(childRel);
        continue;
      }
      walk(entry, childRel);
    }
  };
  const root = dirForRel(rel);
  try {
    if (!root.exists) return [];
  } catch {
    return [];
  }
  if (isNoteDirSync(root)) return [rel];
  walk(root, rel);
  return out;
}

// ---- rename ----

/**
 * mirror PATCH /api/rename:
 * - note → tulis ulang title di note.json, path TETAP (return path sama).
 * - folder/space → rename dir. tabrakan = throw (desktop bisa nimpa, mobile jangan).
 */
export async function renameItem(path: string, nextName: string): Promise<{ path: string }> {
  const current = normalizeRel(path);
  if (!current) throw new Error('empty path');
  const trimmed = nextName.trim() || 'Untitled';

  const dir = dirForRel(current);
  if (isNoteDirSync(dir)) {
    const doc = await readNoteDocByPath(current);
    if (!doc) throw new Error('note not found');
    doc.title = trimmed;
    doc.updatedAt = Date.now();
    writeJsonFile(noteFileByPath(current), doc);
    upsertNoteRow(toNote(current, doc));
    return { path: current };
  }

  const nextPath = joinPosix(dirnamePosix(current), trimmed);
  if (nextPath === current) return { path: current };
  if (dirForRel(nextPath).exists || fileForRel(nextPath).exists) {
    throw new Error('name already exists');
  }
  const notesBefore = collectNotePaths(current);
  const docs = new Map<string, NoteDoc>();
  for (const np of notesBefore) {
    const d = await readNoteDocByPath(np);
    if (d) docs.set(np, d);
  }
  await dir.move(dirForRel(nextPath));
  // rewrite index semua note turunan (spaceId/path/parentPath berubah)
  for (const oldNp of notesBefore) {
    const suffix = oldNp.slice(current.length);
    const newNp = `${nextPath}${suffix}`;
    const d = docs.get(oldNp);
    if (!d) continue;
    removeNoteRow(basenamePosix(oldNp));
    upsertNoteRow(toNote(newNp, d));
  }
  return { path: nextPath };
}

// ---- move ----

/**
 * mirror POST /api/move: pindah note/folder ke parent lain.
 * dedup "nama 1", tolak move ke diri/child sendiri. same-parent = noop.
 */
export async function moveItem(path: string, nextParentPath: string): Promise<{ path: string }> {
  const current = normalizeRel(path);
  const nextParent = normalizeRel(nextParentPath);
  if (!current) throw new Error('empty path');
  if (!nextParent) throw new Error('parent required');
  if (isDescendantPath(current, nextParent)) {
    throw new Error('cannot move an item into itself');
  }
  if (dirnamePosix(current) === nextParent) return { path: current };

  const destParent = dirForRel(nextParent);
  if (!destParent.exists) destParent.create({ intermediates: true });
  const nextPath = uniqueChildPath(nextParent, basenamePosix(current));

  const notesBefore = collectNotePaths(current);
  const docs = new Map<string, NoteDoc>();
  for (const np of notesBefore) {
    const d = await readNoteDocByPath(np);
    if (d) docs.set(np, d);
  }
  await dirForRel(current).move(dirForRel(nextPath));
  for (const oldNp of notesBefore) {
    const suffix = oldNp.slice(current.length);
    const newNp = `${nextPath}${suffix}`;
    const d = docs.get(oldNp);
    if (!d) continue;
    removeNoteRow(basenamePosix(oldNp));
    upsertNoteRow(toNote(newNp, d));
  }
  return { path: nextPath };
}

// ---- delete → trash ----

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * mirror DELETE /api/notes/:path: tiap note di bawah path dipindah ke
 * Trash/<basename>/ + catat originalPath di single meta. sisa dir kosong
 * dihapus. balikin jumlah note yang masuk trash.
 */
export async function deleteItemToTrash(path: string): Promise<number> {
  const current = normalizeRel(path);
  if (!current) return 0;
  if (current === TRASH_ID || current.startsWith(`${TRASH_ID}/`)) return 0;

  const notePaths = collectNotePaths(current);
  if (notePaths.length === 0) {
    // folder kosong → buang aja, ga ada yang ke-trash
    try {
      const dir = dirForRel(current);
      if (dir.exists && !isNoteDirSync(dir)) dir.delete();
    } catch {
      // abaikan
    }
    return 0;
  }

  const trashDir = dirForRel(TRASH_ID);
  if (!trashDir.exists) trashDir.create();
  const meta = await readTrashMeta();
  const now = Date.now();

  for (const notePath of notePaths) {
    const base = basenamePosix(notePath);
    // suffix dash 1:1 desktop (`<uuid>-1`, bukan " 1" ala uniquePath folder)
    let destName = base;
    let i = 1;
    while (meta[destName] || dirForRel(joinPosix(TRASH_ID, destName)).exists) {
      destName = `${base}-${i}`;
      i += 1;
    }
    try {
      await dirForRel(notePath).move(dirForRel(joinPosix(TRASH_ID, destName)));
    } catch {
      continue;
    }
    meta[destName] = { originalPath: notePath, deletedAt: now };
    const doc = await readNoteDocByPath(joinPosix(TRASH_ID, destName));
    removeNoteRow(base);
    if (doc) {
      upsertNoteRow(toNote(joinPosix(TRASH_ID, destName), doc));
    }
  }
  writeTrashMeta(meta);

  // sisa folder kosong (dan file .trash-meta legacy) dibersihin
  try {
    const dir = dirForRel(current);
    if (dir.exists && !isNoteDirSync(dir)) dir.delete();
  } catch {
    // abaikan — reindex berikutnya yang beresin
  }
  return notePaths.length;
}

// ---- trash: list / restore / empty (mirror server/routes/trash.js) ----

export async function listTrash(): Promise<TrashNote[]> {
  const meta = await readTrashMeta();
  const out: TrashNote[] = [];
  for (const [name, entry] of Object.entries(meta)) {
    const trashPath = joinPosix(TRASH_ID, name);
    const doc = await readNoteDocByPath(trashPath);
    if (!doc) continue;
    const body = docToText(doc);
    out.push({
      title: doc.title || 'Untitled',
      trashPath,
      originalPath: entry.originalPath,
      deletedAt: entry.deletedAt,
      preview: docPreview(doc) || body.split('\n')[0]?.trim() || '',
    });
  }
  out.sort((a, b) => b.deletedAt - a.deletedAt);
  return out;
}

export async function restoreTrashItem(name: string): Promise<string> {
  const meta = await readTrashMeta();
  const entry = meta[name];
  if (!entry) throw new Error('not in trash');
  const trashPath = joinPosix(TRASH_ID, name);
  const doc = await readNoteDocByPath(trashPath);
  if (!doc) throw new Error('note not found');

  // balik ke originalPath, tabrakan = suffix dash (mirror desktop restore).
  const origParent = dirnamePosix(entry.originalPath);
  const parent = dirForRel(origParent);
  if (!parent.exists) parent.create({ intermediates: true });
  const origBase = basenamePosix(entry.originalPath);
  let destPath = joinPosix(origParent, origBase);
  let i = 1;
  while (dirForRel(destPath).exists || fileForRel(destPath).exists) {
    destPath = joinPosix(origParent, `${origBase}-${i}`);
    i += 1;
  }
  await dirForRel(trashPath).move(dirForRel(destPath));
  delete meta[name];
  writeTrashMeta(meta);
  removeNoteRow(name);
  upsertNoteRow(toNote(destPath, doc));
  return destPath;
}

export async function permanentDeleteTrashItem(name: string): Promise<void> {
  // mirror desktop: rm dulu (walau meta ga ada), baru bersihin meta + index.
  try {
    const dir = dirForRel(joinPosix(TRASH_ID, name));
    if (dir.exists) dir.delete();
  } catch {
    // abaikan
  }
  const meta = await readTrashMeta();
  delete meta[name];
  writeTrashMeta(meta);
  removeNoteRow(name);
}

export async function emptyTrash(): Promise<void> {
  // mirror desktop: habisin SEMUA isi Trash (bukan cuma yang ada di meta).
  try {
    const trashDir = dirForRel(TRASH_ID);
    if (trashDir.exists) {
      for (const entry of trashDir.list()) {
        if (entry.name.startsWith('.')) continue;
        try {
          if (entry instanceof Directory) entry.delete();
          else entry.delete();
        } catch {
          // abaikan per-entry
        }
      }
    }
  } catch {
    // abaikan
  }
  writeTrashMeta({});
  try {
    getDb().runSync('DELETE FROM notes WHERE spaceId = ?', TRASH_ID);
    getDb().runSync('DELETE FROM note_fts WHERE id NOT IN (SELECT id FROM notes)');
  } catch {
    // abaikan
  }
}

/** buang item trash > 30 hari (mirror purgeOldTrashItems). dipanggil pas reindex. */
export async function purgeOldTrash(): Promise<void> {
  try {
    const meta = await readTrashMeta();
    const now = Date.now();
    let changed = false;
    for (const [name, entry] of Object.entries(meta)) {
      if (now - entry.deletedAt > TRASH_RETENTION_MS) {
        try {
          dirForRel(joinPosix(TRASH_ID, name)).delete();
        } catch {
          // abaikan
        }
        delete meta[name];
        removeNoteRow(name);
        changed = true;
      }
    }
    if (changed) writeTrashMeta(meta);
  } catch {
    // best-effort
  }
}
