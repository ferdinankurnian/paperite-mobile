export type SpaceId =
  'inbox' | 'music' | 'under-essence' | 'journal' | 'avald-studio' | 'homesick' | 'trash';

export type Space = {
  id: SpaceId;
  name: string;
  icon: string;
  kind: 'system' | 'space';
};

export type Note = {
  id: string;
  spaceId: SpaceId;
  title: string;
  preview: string;
  body: string;
  updatedAt: string;
};

export const SPACES: Space[] = [
  { id: 'inbox', name: 'Inbox', icon: 'inbox', kind: 'system' },
  { id: 'music', name: 'Music', icon: 'music-note', kind: 'space' },
  { id: 'under-essence', name: 'Under Essence', icon: 'favorite-border', kind: 'space' },
  { id: 'journal', name: 'Journal', icon: 'menu-book', kind: 'space' },
  { id: 'avald-studio', name: 'Avald Studio', icon: 'folder', kind: 'space' },
  { id: 'homesick', name: 'HOMESICK', icon: 'nights-stay', kind: 'space' },
  { id: 'trash', name: 'Trash', icon: 'delete-outline', kind: 'system' },
];

export const NOTES: Note[] = [
  {
    id: '1',
    spaceId: 'music',
    title: '1. Overture',
    preview: 'Pembukaan dari album ini. Tentang kondisi sekarang.',
    body: 'Pembukaan dari album ini. Tentang kondisi sekarang.\n\nSuara pertama yang keluar — pelan, hati-hati.',
    updatedAt: '2026-08-20',
  },
  {
    id: '2',
    spaceId: 'music',
    title: '2. scrambled',
    preview:
      'Life is already fucked up. Someone said that your life are just got started, but you already...',
    body: 'Life is already fucked up. Someone said that your life are just got started, but you already know how it ends.\n\nScrambled — everything mixed, nothing in place.',
    updatedAt: '2026-08-18',
  },
  {
    id: '3',
    spaceId: 'music',
    title: "3. I'm not an involver",
    preview: "It's so hypocritical",
    body: "It's so hypocritical.\n\nI'm not an involver — or at least that's what I keep telling myself.",
    updatedAt: '2026-08-15',
  },
  {
    id: '5',
    spaceId: 'music',
    title: '5. Manifestasi',
    preview: 'Manusia butuh motivasi dan validasi.',
    body: 'Manusia butuh motivasi dan validasi.\n\nManifestasi bukan cuma kata — kadang cuma alasan biar tetap jalan.',
    updatedAt: '2026-08-12',
  },
  {
    id: '6',
    spaceId: 'music',
    title: '6. makan lagi..',
    preview: 'Keadaan mencekam. Semuanya menuntut satu sama lain. Hopes and dreams.',
    body: 'Keadaan mencekam. Semuanya menuntut satu sama lain. Hopes and dreams.\n\nMakan lagi — ritual kecil biar dunia ga langsung runtuh.',
    updatedAt: '2026-08-10',
  },
  {
    id: '7',
    spaceId: 'music',
    title: '7. Automatique',
    preview: 'mon body tea never lies uh',
    body: 'mon body tea never lies uh\n\nAutomatique — gerak tanpa pikir, sampe lupa kenapa mulai.',
    updatedAt: '2026-08-08',
  },
  {
    id: '10',
    spaceId: 'music',
    title: '10. ngmi',
    preview: 'Having lots of hopes and dreams, but am i...',
    body: 'Having lots of hopes and dreams, but am i even going to make it?\n\nngmi — joke yang kadang terlalu jujur.',
    updatedAt: '2026-08-05',
  },
  ...Array.from({ length: 40 }, (_, index): Note => {
    const number = index + 11;
    const paddedNumber = String(number).padStart(2, '0');

    return {
      id: `scroll-test-${number}`,
      spaceId: 'music',
      title:
        number % 5 === 0
          ? `${paddedNumber}. a deliberately long note title for scroll testing`
          : `${paddedNumber}. scroll test note`,
      preview:
        number % 3 === 0
          ? 'Catatan tambahan untuk bikin halaman panjang dan memastikan list bisa discroll sampai bawah.'
          : `Isi catatan dummy nomor ${number} untuk testing scroll page.`,
      body: `Isi catatan dummy nomor ${number} untuk testing scroll page.\n\nIni cuma data sementara buat QA.`,
      updatedAt: `2026-07-${String(31 - (index % 28)).padStart(2, '0')}`,
    };
  }),
  {
    id: 'n1',
    spaceId: 'inbox',
    title: 'noticed u far away',
    preview: 'notice from this distance',
    body: 'noticed u far away\n\nnotice from this distance\n\ntapi kau pergi dariku?',
    updatedAt: '2026-08-27',
  },
  {
    id: 'n2',
    spaceId: 'inbox',
    title: 'quick capture',
    preview: 'ide random yang belum ke-space',
    body: 'ide random yang belum ke-space.\n\ntaruh di inbox dulu.',
    updatedAt: '2026-08-26',
  },
  {
    id: 'j1',
    spaceId: 'journal',
    title: 'hari ini',
    preview: 'catatan singkat sebelum tidur',
    body: 'catatan singkat sebelum tidur.\n\nhari ini lumayan. besok coba lagi.',
    updatedAt: '2026-08-28',
  },
];

export function getNotesForSpace(spaceId: SpaceId): Note[] {
  return NOTES.filter((n) => n.spaceId === spaceId);
}

export function getNoteById(id: string): Note | undefined {
  return NOTES.find((n) => n.id === id);
}

export function getSpaceById(id: SpaceId): Space | undefined {
  return SPACES.find((s) => s.id === id);
}
