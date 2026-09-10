// sqlite cuma index (search + list cepat), BUKAN source of truth.
// source of truth tetap note.json di disk — sama kayak desktop yang pake
// .paperite/index.sqlite. db ini hidup di sandbox sqlite bawaan expo,
// jadi meski user utak-atik folder Paperite, rebuild dari scan tetap bisa.

import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

export type NoteRow = {
  id: string;
  spaceId: string;
  title: string;
  preview: string;
  body: string;
  updatedAt: number;
};

let db: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync('paperite.db');
    db.execSync(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        spaceId TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        preview TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        updatedAt INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS notes_space_idx ON notes(spaceId, updatedAt DESC);
      CREATE VIRTUAL TABLE IF NOT EXISTS note_fts USING fts5(
        id UNINDEXED,
        title,
        body
      );
    `);
  }
  return db;
}

export function upsertNoteRow(note: NoteRow) {
  const database = getDb();
  database.runSync(
    `INSERT INTO notes (id, spaceId, title, preview, body, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       spaceId = excluded.spaceId,
       title = excluded.title,
       preview = excluded.preview,
       body = excluded.body,
       updatedAt = excluded.updatedAt`,
    note.id,
    note.spaceId,
    note.title,
    note.preview,
    note.body,
    note.updatedAt
  );
  database.runSync('DELETE FROM note_fts WHERE id = ?', note.id);
  database.runSync('INSERT INTO note_fts (id, title, body) VALUES (?, ?, ?)', note.id, note.title, note.body);
}

export function removeNoteRow(id: string) {
  const database = getDb();
  database.runSync('DELETE FROM notes WHERE id = ?', id);
  database.runSync('DELETE FROM note_fts WHERE id = ?', id);
}

/** buang baris yang file-nya udah ga ada di disk (habis manual import / hapus). */
export function pruneNoteRows(keepIds: string[]) {
  const database = getDb();
  if (keepIds.length === 0) {
    database.runSync('DELETE FROM notes');
    database.runSync('DELETE FROM note_fts');
    return;
  }
  const placeholders = keepIds.map(() => '?').join(',');
  database.runSync(`DELETE FROM notes WHERE id NOT IN (${placeholders})`, ...keepIds);
  database.runSync(`DELETE FROM note_fts WHERE id NOT IN (${placeholders})`, ...keepIds);
}

export function allNoteRows(spaceId: string): NoteRow[] {
  return getDb().getAllSync<NoteRow>(
    'SELECT id, spaceId, title, preview, body, updatedAt FROM notes WHERE spaceId = ? ORDER BY updatedAt DESC',
    spaceId
  );
}

export function getNoteRow(id: string): NoteRow | null {
  return (
    getDb().getFirstSync<NoteRow>(
      'SELECT id, spaceId, title, preview, body, updatedAt FROM notes WHERE id = ?',
      id
    ) ?? null
  );
}

function toFtsQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .map((term) => `"${term.replaceAll('"', '""')}"*`)
    .join(' ');
}

export function searchNoteRows(query: string, spaceId?: string): NoteRow[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const database = getDb();
  try {
    const fts = toFtsQuery(trimmed);
    if (spaceId) {
      return database.getAllSync<NoteRow>(
        `SELECT notes.id, notes.spaceId, notes.title, notes.preview, notes.body, notes.updatedAt
         FROM note_fts JOIN notes ON notes.id = note_fts.id
         WHERE note_fts MATCH ? AND notes.spaceId = ?
         ORDER BY rank LIMIT 50`,
        fts,
        spaceId
      );
    }
    return database.getAllSync<NoteRow>(
      `SELECT notes.id, notes.spaceId, notes.title, notes.preview, notes.body, notes.updatedAt
       FROM note_fts JOIN notes ON notes.id = note_fts.id
       WHERE note_fts MATCH ?
       ORDER BY rank LIMIT 50`,
      fts
    );
  } catch {
    // fts query gagal (karakter aneh) → fallback LIKE, jangan crash.
    const like = `%${trimmed.replace(/[%_\\]/g, '\\$&')}%`;
    if (spaceId) {
      return database.getAllSync<NoteRow>(
        `SELECT id, spaceId, title, preview, body, updatedAt FROM notes
         WHERE spaceId = ? AND (title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\')
         ORDER BY updatedAt DESC LIMIT 50`,
        spaceId,
        like,
        like
      );
    }
    return database.getAllSync<NoteRow>(
      `SELECT id, spaceId, title, preview, body, updatedAt FROM notes
       WHERE title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\'
       ORDER BY updatedAt DESC LIMIT 50`,
      like,
      like
    );
  }
}
