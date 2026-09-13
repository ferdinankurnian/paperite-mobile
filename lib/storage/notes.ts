// notes = dir isi note.json di dalam space/folder (rekursif, 1:1 desktop).
// isi note.json itu TipTap JSON asli 1:1 sama desktop — mobile baca-tulis
// langsung format itu, jadi bolak-balik hp ↔ laptop ga ada yang ke-strip.
// baca/tulis selalu lewat sini biar db index + file di disk tetap sinkron.

import { Directory, File } from 'expo-file-system';

import type { Note, NoteWithContent, SpaceId, WorkspaceItem } from '@/lib/paperite-data';
import { allNoteRows, getNoteRow, pruneNoteRows, searchNoteRows, upsertNoteRow } from './db';
import {
  deleteItemToTrash as deletePathToTrash,
  migrateLegacyPerDirTrashMetas,
  purgeOldTrash,
  spaceOfPath,
} from './folders';
import {
  ASSETS_DIRNAME,
  basenamePosix,
  dirForRel,
  dirnamePosix,
  ensureWorkspace,
  isNoteDirSync,
  joinPosix,
  LEGACY_INBOX_ID,
  LEGACY_TRASH_ID,
  migrateLegacyCaseDirs,
  newNoteUuid,
  normalizeRel,
  noteFileByPath,
  readJsonFile,
  scanSpaceIds,
  TRASH_ID,
  writeJsonFile,
} from './files';
import { docPreview, docToText, type NoteDoc } from './note-format';
import { denormalizeDocForStorage } from './note-images';

export type NoteContent = Record<string, unknown>[];

export type NewNoteInput = {
  spaceId: SpaceId;
  /** parent posix ("Riset" / "Riset/Meeting") — menang atas spaceId kalau diisi. */
  parentPath?: string;
  title: string;
  content: NoteContent;
};

const EMPTY_CONTENT: NoteContent = [{ type: 'paragraph' }];

function toNote(notePath: string, doc: NoteDoc): Note {
  const body = docToText(doc);
  const rel = normalizeRel(notePath);
  return {
    id: basenamePosix(rel),
    spaceId: spaceOfPath(rel),
    path: rel,
    parentPath: dirnamePosix(rel),
    title: doc.title || 'Untitled',
    preview: docPreview(doc) || body.split('\n')[0]?.trim() || '',
    body,
    updatedAt: doc.updatedAt,
    pinned: doc.pinned === true,
  };
}

function toNoteWithContent(notePath: string, doc: NoteDoc): NoteWithContent {
  return {
    ...toNote(notePath, doc),
    content: (doc.content ?? EMPTY_CONTENT) as NoteContent,
  };
}

function buildDoc(
  id: string,
  title: string,
  content: NoteContent,
  updatedAt: number,
  pinned = false
): NoteDoc {
  return {
    id,
    type: 'doc',
    title: title.trim() || 'Untitled',
    content: content.length > 0 ? (content as NoteDoc['content']) : [{ type: 'paragraph' }],
    updatedAt,
    pinned,
  };
}

/** 1:1 desktop pinFirst: pinned di atas dalam level-nya sendiri,
 *  urutan dalam grup tetap ikut sort sebelumnya (newest). */
function pinFirst(notes: Note[]): Note[] {
  return [...notes.filter((n) => n.pinned), ...notes.filter((n) => !n.pinned)];
}

/** data URL image (hasil paste/gallery/clipboard) → file assets/ + path
 *  relatif. gagal = konten mentah yang kesimpen, save ga boleh mati. */
async function withPersistedImages(notePath: string, content: NoteContent): Promise<NoteContent> {
  try {
    const doc = await denormalizeDocForStorage(notePath, { content });
    return doc.content as NoteContent;
  } catch {
    return content;
  }
}

async function readNoteDocByPath(notePath: string): Promise<NoteDoc | null> {
  return readJsonFile<NoteDoc>(noteFileByPath(notePath));
}

/** walk rekursif: kumpulin semua note path di bawah rel (mirror scanDirectory). */
function collectNotesUnder(rel: string, out: string[]) {
  const dir = dirForRel(rel);
  let entries: (Directory | File)[];
  try {
    if (!dir.exists) return;
    entries = dir.list();
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (!(entry instanceof Directory)) continue;
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (isNoteDirSync(entry)) {
      out.push(childRel);
      continue;
    }
    collectNotesUnder(childRel, out);
  }
}

/** scan disk → tulis ulang index → balikin notes (flat, newest dulu).
 *  dipake pas list biar ga stale. */
async function scanSpaceNotesFlat(spaceId: string): Promise<Note[]> {
  ensureWorkspace();
  const paths: string[] = [];
  collectNotesUnder(normalizeRel(spaceId), paths);
  const notes: Note[] = [];
  for (const p of paths) {
    const doc = await readNoteDocByPath(p);
    if (!doc) continue;
    const note = toNote(p, doc);
    notes.push(note);
    upsertNoteRow(note);
  }
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  return pinFirst(notes);
}

/**
 * scan disk jadi tree folders-dulu-alpha + notes-newest (mirror desktop
 * scanDirectory return [...folders, ...notes] per level).
 */
export async function listSpaceTree(spaceId: string): Promise<WorkspaceItem[]> {
  ensureWorkspace();
  const rel = normalizeRel(spaceId);

  const scanLevel = async (levelRel: string): Promise<WorkspaceItem[]> => {
    const dir = dirForRel(levelRel);
    let entries: (Directory | File)[];
    try {
      if (!dir.exists) return [];
      entries = dir.list();
    } catch {
      return [];
    }
    const folders: { name: string; rel: string; dir: Directory }[] = [];
    const notes: Note[] = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (!(entry instanceof Directory)) continue;
      const childRel = levelRel ? `${levelRel}/${entry.name}` : entry.name;
      if (isNoteDirSync(entry)) {
        const doc = await readNoteDocByPath(childRel);
        if (!doc) continue;
        const note = toNote(childRel, doc);
        notes.push(note);
        upsertNoteRow(note);
        continue;
      }
      folders.push({ name: entry.name, rel: childRel, dir: entry });
    }
    folders.sort((a, b) => a.name.localeCompare(b.name));
    notes.sort((a, b) => b.updatedAt - a.updatedAt);
    const ordered = pinFirst(notes);
    const out: WorkspaceItem[] = [];
    for (const f of folders) {
      out.push({ type: 'folder', title: f.name, path: f.rel, children: await scanLevel(f.rel) });
    }
    for (const n of ordered) {
      out.push({ type: 'note', path: n.path, note: n });
    }
    return out;
  };

  return scanLevel(rel);
}

export async function listNotes(spaceId: SpaceId): Promise<Note[]> {
  // db dulu biar cepet; kalau kosong (fresh install / db kehapus) scan disk.
  // legacy space id (lowercase) ikut dicek biar migrasi ga bikin list kedip.
  const ids = [spaceId];
  if (spaceId === 'Inbox') ids.push(LEGACY_INBOX_ID);
  if (spaceId === TRASH_ID) ids.push(LEGACY_TRASH_ID);
  for (const id of ids) {
    const cached = allNoteRows(id);
    if (cached.length > 0) {
      const mapped = cached.map((r) => ({
        id: r.id,
        spaceId: r.spaceId,
        path: r.path,
        parentPath: r.parentPath,
        title: r.title,
        preview: r.preview,
        body: r.body,
        updatedAt: r.updatedAt,
        pinned: r.pinned === 1,
      }));
      // db lama pre-migrasi: row spaceId lowercase tapi space minta kapital.
      // balikin yang match biar list ga kosong pasca-migrasi dir.
      if (id !== spaceId) {
        for (const n of mapped) {
          n.spaceId = spaceId;
          if (n.path.startsWith(`${id}/`)) {
            n.path = `${spaceId}${n.path.slice(id.length)}`;
            n.parentPath = dirnamePosix(n.path);
          }
        }
      }
      // db sort updatedAt DESC — pinned tetap di atas (1:1 desktop pinFirst).
      return pinFirst(mapped);
    }
  }
  const primary = await scanSpaceNotesFlat(spaceId);
  if (primary.length > 0) return primary;
  // db kosong + disk kapital kosong → mungkin data masih di dir legacy
  if (spaceId === 'Inbox') return scanSpaceNotesFlat(LEGACY_INBOX_ID);
  if (spaceId === TRASH_ID) return scanSpaceNotesFlat(LEGACY_TRASH_ID);
  return [];
}

/** cari note path by id (basename) — rekursif semua space + trash. */
export async function findNotePathById(id: string): Promise<string | null> {
  ensureWorkspace();
  const hinted = normalizeRel(id);
  // kalau yang dikirim udah path penuh, cek langsung
  if (hinted.includes('/')) {
    try {
      if (isNoteDirSync(dirForRel(hinted))) return hinted;
    } catch {
      // lanjut scan
    }
  }
  const base = basenamePosix(hinted);
  const spaces = [...scanSpaceIds(), TRASH_ID, LEGACY_INBOX_ID, LEGACY_TRASH_ID];
  for (const spaceId of new Set(spaces)) {
    const paths: string[] = [];
    collectNotesUnder(normalizeRel(spaceId), paths);
    for (const p of paths) {
      if (basenamePosix(p) === base) return p;
    }
  }
  return null;
}

/** rebuild penuh — dipake tiap cold start biar manual import dari
 *  desktop (adb push) langsung muncul + ghost row ke-prune. */
export async function reindexAll(): Promise<void> {
  await migrateLegacyCaseDirs();
  await migrateLegacyPerDirTrashMetas();
  await purgeOldTrash();
  const seen: string[] = [];
  for (const spaceId of scanSpaceIds()) {
    for (const note of await scanSpaceNotesFlat(spaceId)) seen.push(note.id);
  }
  for (const note of await scanSpaceNotesFlat(TRASH_ID)) seen.push(note.id);
  // legacy sisa (belum ke-merge karena tabrakan) tetap ke-index, ga hilang
  for (const note of await scanSpaceNotesFlat(LEGACY_INBOX_ID)) seen.push(note.id);
  for (const note of await scanSpaceNotesFlat(LEGACY_TRASH_ID)) seen.push(note.id);
  pruneNoteRows(seen);
}

/** selalu baca dari file biar konten TipTap-nya fresh (db cuma index teks).
 *  urutan: tebak flat (legacy) → path dari db index → scan rekursif. */
export async function readNoteById(
  id: string,
  hintSpaceId?: string
): Promise<NoteWithContent | null> {
  const base = basenamePosix(normalizeRel(id));
  if (hintSpaceId) {
    const guess = joinPosix(hintSpaceId, base);
    try {
      if (isNoteDirSync(dirForRel(guess))) {
        const doc = await readNoteDocByPath(guess);
        if (doc) {
          const note = toNoteWithContent(guess, doc);
          upsertNoteRow(toNote(guess, doc));
          return note;
        }
      }
    } catch {
      // lanjut
    }
  }
  // db tau path terakhir (O(1)) — validasi file masih ada biar ga stale.
  try {
    const row = getNoteRow(base);
    if (row?.path) {
      const rel = normalizeRel(row.path);
      if (isNoteDirSync(dirForRel(rel))) {
        const doc = await readNoteDocByPath(rel);
        if (doc) {
          const note = toNoteWithContent(rel, doc);
          upsertNoteRow(toNote(rel, doc));
          return note;
        }
      }
    }
  } catch {
    // lanjut scan
  }
  const found = await findNotePathById(base);
  if (!found) return null;
  const doc = await readNoteDocByPath(found);
  if (!doc) return null;
  const note = toNoteWithContent(found, doc);
  upsertNoteRow(toNote(found, doc));
  return note;
}

/** baca by path penuh ("Riset/Meeting/<uuid>"). */
export async function readNoteByPath(path: string): Promise<NoteWithContent | null> {
  const rel = normalizeRel(path);
  const doc = await readNoteDocByPath(rel);
  if (!doc) return null;
  const note = toNoteWithContent(rel, doc);
  upsertNoteRow(toNote(rel, doc));
  return note;
}

function resolveParent(input: NewNoteInput): string {
  if (input.parentPath && normalizeRel(input.parentPath)) {
    return normalizeRel(input.parentPath);
  }
  return normalizeRel(input.spaceId);
}

export async function createNote(input: NewNoteInput): Promise<NoteWithContent> {
  ensureWorkspace();
  let parent = resolveParent(input);
  if (parent === TRASH_ID || parent.startsWith(`${TRASH_ID}/`)) parent = 'Inbox';
  if (parent === LEGACY_TRASH_ID) parent = LEGACY_INBOX_ID;
  const parentDir = dirForRel(parent);
  if (!parentDir.exists) parentDir.create({ intermediates: true });
  const id = newNoteUuid();
  const notePath = joinPosix(parent, id);
  const updatedAt = Date.now();
  const doc = buildDoc(
    id,
    input.title,
    await withPersistedImages(notePath, input.content),
    updatedAt
  );
  const dir = dirForRel(notePath);
  if (!dir.exists) dir.create();
  const assets = new Directory(dir, ASSETS_DIRNAME);
  if (!assets.exists) assets.create();
  writeJsonFile(noteFileByPath(notePath), doc);
  const note = toNoteWithContent(notePath, doc);
  upsertNoteRow(toNote(notePath, doc));
  return note;
}

/** seed butuh id + waktu stabil (biar data demo konsisten) — jangan dipake buat note baru. */
export async function createNoteWithId(
  spaceId: SpaceId,
  id: string,
  title: string,
  content: NoteContent,
  updatedAt: number,
  parentPath?: string
): Promise<NoteWithContent> {
  ensureWorkspace();
  const parent = parentPath ? normalizeRel(parentPath) : normalizeRel(spaceId);
  const notePath = joinPosix(parent, id);
  const doc = buildDoc(id, title, await withPersistedImages(notePath, content), updatedAt);
  const dir = dirForRel(notePath);
  if (!dir.exists) dir.create();
  writeJsonFile(noteFileByPath(notePath), doc);
  const note = toNoteWithContent(notePath, doc);
  upsertNoteRow(toNote(notePath, doc));
  return note;
}

export async function updateNote(
  id: string,
  patch: { title?: string; content?: NoteContent }
): Promise<NoteWithContent | null> {
  const existing = await readNoteById(id);
  if (!existing) return null;
  const title = (patch.title ?? existing.title).trim() || 'Untitled';
  const content =
    patch.content !== undefined
      ? await withPersistedImages(existing.path, patch.content)
      : existing.content;
  const updatedAt = Date.now();
  // pin ikut kebawa — edit isi ga boleh nge-unpin (1:1 desktop).
  const doc = buildDoc(existing.id, title, content, updatedAt, existing.pinned);
  writeJsonFile(noteFileByPath(existing.path), doc);
  const note = toNoteWithContent(existing.path, doc);
  upsertNoteRow(toNote(existing.path, doc));
  return note;
}

export async function deleteNoteToTrash(id: string): Promise<boolean> {
  const existing = await readNoteById(id);
  if (!existing || existing.spaceId === TRASH_ID) return false;
  const moved = await deletePathToTrash(existing.path).catch(() => 0);
  return moved > 0;
}

/** 1:1 desktop `notes:set-pinned`: toggle pin tanpa nyentuh updatedAt
 *  (pin ga boleh bikin note mental ke atas newest — dia udah di atas
 *  karena pinned). pin scope per parent folder, sorting yang urus. */
export async function setNotePinned(id: string, pinned: boolean): Promise<Note | null> {
  ensureWorkspace();
  const base = basenamePosix(normalizeRel(id));
  const found = await findNotePathById(base);
  if (!found) return null;
  const doc = await readNoteDocByPath(found);
  if (!doc) return null;
  doc.pinned = pinned;
  writeJsonFile(noteFileByPath(found), doc);
  const note = toNote(found, doc);
  upsertNoteRow(note);
  return note;
}

export function searchNotes(query: string, spaceId?: SpaceId): Note[] {
  return searchNoteRows(query, spaceId).map((r) => ({
    id: r.id,
    spaceId: r.spaceId,
    path: r.path || `${r.spaceId}/${r.id}`,
    parentPath: r.parentPath || r.spaceId,
    title: r.title,
    preview: r.preview,
    body: r.body,
    updatedAt: r.updatedAt,
    pinned: r.pinned === 1,
  }));
}

export { NOTE_FILENAME } from './files';
