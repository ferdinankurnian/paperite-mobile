// sqlite cuma index (search + list cepat), BUKAN source of truth.
// source of truth tetap note.json di disk — sama kayak desktop yang pake
// .paperite/index.sqlite. db ini hidup di sandbox sqlite bawaan expo,
// jadi meski user utak-atik folder Paperite, rebuild dari scan tetap bisa.

import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

export type NoteRow = {
  id: string;
  spaceId: string;
  /** path posix penuh ("Riset/Meeting/<uuid>") — 1:1 desktop. */
  path: string;
  /** parent posix ("Riset" / "Riset/Meeting"). */
  parentPath: string;
  title: string;
  preview: string;
  body: string;
  updatedAt: number;
  /** mirror doc.pinned — 1 kalau pinned, biar list bisa sort tanpa baca file. */
  pinned: number;
};

let db: SQLiteDatabase | null = null;

function ensureColumns(database: SQLiteDatabase) {
  // migrasi ringan: db lama (v1 flat) belum punya path/parentPath.
  for (const col of ['path', 'parentPath']) {
    try {
      database.execSync(`ALTER TABLE notes ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
    } catch {
      // udah ada — sqlite ga punya IF NOT EXISTS buat ADD COLUMN
    }
  }
  // pin (plan desktop 007): db lama belum punya kolom pinned.
  try {
    database.execSync('ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0');
  } catch {
    // udah ada
  }
}

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
    `);
    // kolom path/parentPath HARUS ada dulu sebelum index di bawah —
    // db lama (pre-folder) ga punya, dan CREATE TABLE di atas no-op di situ.
    ensureColumns(db);
    db.execSync(`
      CREATE INDEX IF NOT EXISTS notes_space_idx ON notes(spaceId, updatedAt DESC);
      CREATE INDEX IF NOT EXISTS notes_parent_idx ON notes(parentPath);
      CREATE VIRTUAL TABLE IF NOT EXISTS note_fts USING fts5(
        id UNINDEXED,
        title,
        body
      );
    `);
  }
  return db;
}

/** nerima Note (pinned boolean) maupun NoteRow (pinned 0/1) —
 *  dinormalisasi di sini biar caller ga perlu convert manual. */
export function upsertNoteRow(note: Omit<NoteRow, 'pinned'> & { pinned: boolean | number }) {
  const pinned = typeof note.pinned === 'boolean' ? (note.pinned ? 1 : 0) : note.pinned;
  const database = getDb();
  database.runSync(
    `INSERT INTO notes (id, spaceId, path, parentPath, title, preview, body, updatedAt, pinned)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       spaceId = excluded.spaceId,
       path = excluded.path,
       parentPath = excluded.parentPath,
       title = excluded.title,
       preview = excluded.preview,
       body = excluded.body,
       updatedAt = excluded.updatedAt,
       pinned = excluded.pinned`,
    note.id,
    note.spaceId,
    note.path,
    note.parentPath,
    note.title,
    note.preview,
    note.body,
    note.updatedAt,
    pinned
  );
  database.runSync('DELETE FROM note_fts WHERE id = ?', note.id);
  database.runSync(
    'INSERT INTO note_fts (id, title, body) VALUES (?, ?, ?)',
    note.id,
    note.title,
    note.body
  );
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

const NOTE_COLS = 'id, spaceId, path, parentPath, title, preview, body, updatedAt, pinned';

export function allNoteRows(spaceId: string): NoteRow[] {
  const rows = getDb().getAllSync<NoteRow>(
    `SELECT ${NOTE_COLS} FROM notes WHERE spaceId = ? ORDER BY updatedAt DESC`,
    spaceId
  );
  return backfillPaths(rows, spaceId);
}

/**
 * db lama (pre-folder) path-nya kosong — rekonstruksi "spaceId/id"
 * biar caller baru ga perlu branching.
 */
function backfillPaths(rows: NoteRow[], fallbackSpace: string): NoteRow[] {
  let dirty = false;
  for (const r of rows) {
    if (!r.path) {
      r.path = `${r.spaceId || fallbackSpace}/${r.id}`;
      dirty = true;
    }
    if (!r.parentPath) {
      const i = r.path.lastIndexOf('/');
      r.parentPath = i < 0 ? r.spaceId || fallbackSpace : r.path.slice(0, i);
      dirty = true;
    }
  }
  if (dirty) {
    // tulis balik biar migrasi sekali aja — best effort
    try {
      const database = getDb();
      for (const r of rows) {
        database.runSync(
          'UPDATE notes SET path = ?, parentPath = ? WHERE id = ?',
          r.path,
          r.parentPath,
          r.id
        );
      }
    } catch {
      // abaikan
    }
  }
  return rows;
}

export function getNoteRow(id: string): NoteRow | null {
  const row =
    getDb().getFirstSync<NoteRow>(`SELECT ${NOTE_COLS} FROM notes WHERE id = ?`, id) ?? null;
  if (row && (!row.path || !row.parentPath)) backfillPaths([row], row.spaceId);
  return row;
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
        `SELECT notes.id, notes.spaceId, notes.path, notes.parentPath, notes.title, notes.preview, notes.body, notes.updatedAt, notes.pinned
         FROM note_fts JOIN notes ON notes.id = note_fts.id
         WHERE note_fts MATCH ? AND notes.spaceId = ?
         ORDER BY rank LIMIT 50`,
        fts,
        spaceId
      );
    }
    return database.getAllSync<NoteRow>(
      `SELECT notes.id, notes.spaceId, notes.path, notes.parentPath, notes.title, notes.preview, notes.body, notes.updatedAt, notes.pinned
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
        `SELECT ${NOTE_COLS} FROM notes
         WHERE spaceId = ? AND (title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\')
         ORDER BY updatedAt DESC LIMIT 50`,
        spaceId,
        like,
        like
      );
    }
    return database.getAllSync<NoteRow>(
      `SELECT ${NOTE_COLS} FROM notes
       WHERE title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\'
       ORDER BY updatedAt DESC LIMIT 50`,
      like,
      like
    );
  }
}
