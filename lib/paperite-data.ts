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
  title: string;
  preview: string;
  body: string;
  updatedAt: number;
};

/** note + isi TipTap JSON asli (1:1 sama desktop) — cuma ada pas buka note,
 *  list/search tetap ringan tanpa content. */
export type NoteWithContent = Note & {
  content: Record<string, unknown>[];
};

export function formatNoteDate(updatedAt: number): string {
  try {
    return new Date(updatedAt).toLocaleDateString();
  } catch {
    return '';
  }
}
