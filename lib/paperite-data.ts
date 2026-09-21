// tipe domain paperite-mobile. source of truth untuk Space/Note adalah
// storage (folder + note.json + sqlite index) — file ini cuma tipe,
// bukan data. data demo lama udah dicabut total.

export type SpaceId = string;

export type Space = {
  id: SpaceId;
  name: string;
  /** key lucide 1:1 sama desktop ("music", "pin", ...) atau "custom:<nama>". */
  icon: string;
  kind: 'system' | 'space';
  color?: string;
};

export type Note = {
  id: string;
  spaceId: SpaceId;
  /** path posix penuh di workspace, 1:1 desktop: "Riset/Meeting/<uuid>". */
  path: string;
  /** parent posix: space ("Riset") atau folder ("Riset/Meeting"). */
  parentPath: string;
  title: string;
  preview: string;
  body: string;
  updatedAt: number;
  /** 1:1 desktop (plan 007): pinned float ke atas dalam parent folder-nya aja. */
  pinned: boolean;
};

/** note + isi TipTap JSON asli (1:1 sama desktop) — cuma ada pas buka note,
 *  list/search tetap ringan tanpa content. */
export type NoteWithContent = Note & {
  content: Record<string, unknown>[];
};

/** tree isi space, 1:1 sama WorkspaceItem desktop (folder rekursif). */
export type WorkspaceNoteItem = {
  type: 'note';
  path: string;
  note: Note;
};

export type WorkspaceFolder = {
  type: 'folder';
  title: string;
  path: string;
  children: WorkspaceItem[];
};

export type WorkspaceItem = WorkspaceNoteItem | WorkspaceFolder;

export function formatNoteDate(updatedAt: number): string {
  try {
    return new Date(updatedAt).toLocaleDateString();
  } catch {
    return '';
  }
}

export function formatNoteTime(updatedAt: number): string {
  if (!updatedAt) return '';
  try {
    // Biarkan locale/time format dari device menentukan 12h atau 24h.
    return new Date(updatedAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
