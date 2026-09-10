// notes = folder isi note.json di dalam folder space.
// isi note.json itu TipTap JSON asli 1:1 sama desktop — mobile baca-tulis
// langsung format itu, jadi bolak-balik hp ↔ laptop ga ada yang ke-strip.
// baca/tulis selalu lewat sini biar db index + file di disk tetap sinkron.

import { File } from 'expo-file-system';

import type { Note, NoteWithContent, SpaceId } from '@/lib/paperite-data';
import { allNoteRows, pruneNoteRows, removeNoteRow, searchNoteRows, upsertNoteRow } from './db';
import {
  ensureWorkspace,
  INBOX_ID,
  newNoteId,
  noteDir,
  noteFile,
  NOTE_FILENAME,
  readJsonFile,
  scanNoteIds,
  scanSpaceIds,
  spaceDir,
  TRASH_ID,
  writeJsonFile,
} from './files';
import { docPreview, docToText, type NoteDoc } from './note-format';

export type NoteContent = Record<string, unknown>[];

export type NewNoteInput = {
  spaceId: SpaceId;
  title: string;
  content: NoteContent;
};

const EMPTY_CONTENT: NoteContent = [{ type: 'paragraph' }];

function toNote(spaceId: string, id: string, doc: NoteDoc): Note {
  const body = docToText(doc);
  return {
    id,
    spaceId,
    title: doc.title || 'Untitled',
    preview: docPreview(doc) || body.split('\n')[0]?.trim() || '',
    body,
    updatedAt: doc.updatedAt,
  };
}

function toNoteWithContent(spaceId: string, id: string, doc: NoteDoc): NoteWithContent {
  return {
    ...toNote(spaceId, id, doc),
    content: (doc.content ?? EMPTY_CONTENT) as NoteContent,
  };
}

function buildDoc(id: string, title: string, content: NoteContent, updatedAt: number): NoteDoc {
  return {
    id,
    type: 'doc',
    title: title.trim() || 'Untitled',
    content:
      content.length > 0
        ? (content as NoteDoc['content'])
        : [{ type: 'paragraph' }],
    updatedAt,
  };
}

async function readNoteDoc(spaceId: string, noteId: string): Promise<NoteDoc | null> {
  return readJsonFile<NoteDoc>(noteFile(spaceId, noteId));
}

/** scan disk → tulis ulang index → balikin notes. dipake pas list biar ga stale. */
async function scanSpaceNotes(spaceId: string): Promise<Note[]> {
  ensureWorkspace();
  const notes: Note[] = [];
  for (const noteId of scanNoteIds(spaceId)) {
    const doc = await readNoteDoc(spaceId, noteId);
    if (!doc) continue;
    const note = toNote(spaceId, noteId, doc);
    notes.push(note);
    upsertNoteRow(note);
  }
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  return notes;
}

export async function listNotes(spaceId: SpaceId): Promise<Note[]> {
  // db dulu biar cepet; kalau kosong (fresh install / db kehapus) scan disk.
  const cached = allNoteRows(spaceId);
  if (cached.length > 0) {
    return cached.map((r) => ({
      id: r.id,
      spaceId: r.spaceId,
      title: r.title,
      preview: r.preview,
      body: r.body,
      updatedAt: r.updatedAt,
    }));
  }
  return scanSpaceNotes(spaceId);
}

/** rebuild penuh — dipake tiap cold start biar manual import dari
 *  desktop (adb push) langsung muncul + ghost row ke-prune. */
export async function reindexAll(): Promise<void> {
  const seen: string[] = [];
  for (const spaceId of scanSpaceIds()) {
    for (const note of await scanSpaceNotes(spaceId)) seen.push(note.id);
  }
  for (const note of await scanSpaceNotes(TRASH_ID)) seen.push(note.id);
  pruneNoteRows(seen);
}

/** selalu baca dari file biar konten TipTap-nya fresh (db cuma index teks). */
export async function readNoteById(id: string): Promise<NoteWithContent | null> {
  for (const spaceId of [...scanSpaceIds(), TRASH_ID]) {
    const doc = await readNoteDoc(spaceId, id);
    if (doc) {
      const note = toNoteWithContent(spaceId, id, doc);
      upsertNoteRow(toNote(spaceId, id, doc));
      return note;
    }
  }
  return null;
}

export async function createNote(input: NewNoteInput): Promise<NoteWithContent> {
  ensureWorkspace();
  const targetSpace = input.spaceId === TRASH_ID ? INBOX_ID : input.spaceId;
  const id = newNoteId();
  const updatedAt = Date.now();
  const doc = buildDoc(id, input.title, input.content, updatedAt);
  const dir = noteDir(targetSpace, id);
  if (!dir.exists) dir.create();
  writeJsonFile(noteFile(targetSpace, id), doc);
  const note = toNoteWithContent(targetSpace, id, doc);
  upsertNoteRow(toNote(targetSpace, id, doc));
  return note;
}

/** seed butuh id + waktu stabil (biar data demo konsisten) — jangan dipake buat note baru. */
export async function createNoteWithId(
  spaceId: SpaceId,
  id: string,
  title: string,
  content: NoteContent,
  updatedAt: number
): Promise<NoteWithContent> {
  ensureWorkspace();
  const doc = buildDoc(id, title, content, updatedAt);
  const dir = noteDir(spaceId, id);
  if (!dir.exists) dir.create();
  writeJsonFile(noteFile(spaceId, id), doc);
  const note = toNoteWithContent(spaceId, id, doc);
  upsertNoteRow(toNote(spaceId, id, doc));
  return note;
}

export async function updateNote(
  id: string,
  patch: { title?: string; content?: NoteContent }
): Promise<NoteWithContent | null> {
  const existing = await readNoteById(id);
  if (!existing) return null;
  const title = (patch.title ?? existing.title).trim() || 'Untitled';
  const content = patch.content ?? existing.content;
  const updatedAt = Date.now();
  const doc = buildDoc(id, title, content, updatedAt);
  writeJsonFile(noteFile(existing.spaceId, id), doc);
  const note = toNoteWithContent(existing.spaceId, id, doc);
  upsertNoteRow(toNote(existing.spaceId, id, doc));
  return note;
}

export async function deleteNoteToTrash(id: string): Promise<boolean> {
  const existing = await readNoteById(id);
  if (!existing || existing.spaceId === TRASH_ID) return false;
  const src = noteDir(existing.spaceId, id);
  const destParent = spaceDir(TRASH_ID);
  if (!destParent.exists) destParent.create();
  // pindah folder note apa adanya (note.json + assets ikut).
  const dest = noteDir(TRASH_ID, id);
  if (dest.exists) {
    // tabrakan id di trash (hampir mustahil) — timpa aja biar ga nyangkut.
    dest.delete();
  }
  await src.move(dest);
  // catat space asal di dalam folder trash biar restore gampang nanti.
  writeJsonFile(new File(dest, '.trash-meta.json'), {
    originalSpaceId: existing.spaceId,
    deletedAt: Date.now(),
  });
  removeNoteRow(id);
  const trashed: Note = { ...toNote(TRASH_ID, id, buildDoc(id, existing.title, existing.content, Date.now())) };
  upsertNoteRow(trashed);
  return true;
}

export function searchNotes(query: string, spaceId?: SpaceId): Note[] {
  return searchNoteRows(query, spaceId).map((r) => ({
    id: r.id,
    spaceId: r.spaceId,
    title: r.title,
    preview: r.preview,
    body: r.body,
    updatedAt: r.updatedAt,
  }));
}

export { NOTE_FILENAME };
