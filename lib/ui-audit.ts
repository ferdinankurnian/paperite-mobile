// hasil audit duplikasi UI — sumber buat toggle audit di settings/components.
// tiap id nyambung ke UI_KIT_SECTIONS di app/settings/[section].tsx.
// ringkas aja: pola → kemunculan → rekomendasi standar tunggal.

export type UiAuditFinding = {
  pattern: string;
  where: string[];
  fix: string;
};

export const UI_AUDIT: Record<string, UiAuditFinding[]> = {
  button: [
    {
      pattern: 'icon button bikin sendiri, ga lewat ToolbarItem',
      where: [
        'EditorToolbar BarButton 52x52 r14 (:86-141, ada bg debug #ff0000)',
        'EditorToolbar block pill h52 r14 (:403-422)',
        'SearchBar clear 44x44 r22 (:71-92)',
        'SpaceBottomBar new folder 40x40 r20, border 0 (:84-97)',
        'settings theme picker r12 (:43-58)',
      ],
      fix: 'ToolbarItem jadi default icon button 48. bikin Button (primary h48 r14) + Chip buat segmented 32px.',
    },
    {
      pattern: 'pressed / ripple beda-beda',
      where: [
        'ripple 0.14 dominan (sidebar, settings, noterow, movesheet)',
        'ripple 0.2 cuma ToolbarItem + SearchBar clear',
        'pressed opacity 0.82 / 0.78 / 0.8 / 0.7 / 0.6 campur',
        'SearchBar clear ada scale 0.96 sekali pakai',
      ],
      fix: 'satu Pressable wrapper: ripple 0.14 default, pressed 0.8, disabled 0.4. hapus scale sekali pakai.',
    },
  ],
  separator: [
    {
      pattern: '4 standar separator',
      where: [
        'ToolbarSeparator hairline h24 (:154-157)',
        'EditorToolbar Divider width 1 (bukan hairline) h28 (:143-157)',
        'ToolbarMenu / HoldPreview hairline tanpa opacity, margin beda',
        'settings ml-14 mr-4 h-px vs sidebar mx-4 h-px',
      ],
      fix: 'satu Separator: horizontal (hairline) vs vertical (h24) vs inset (ml-14 settings).',
    },
  ],
  card: [
    {
      pattern: 'card bg + r16 + border ditulis ulang',
      where: [
        'settings list (:78-85) = appearance (:23-29) = about (:80-87)',
        'EditorToolbar popup r16 + shadow (:604-614)',
        'NoteHoldPreview preview r16 border foreground 0.12 (beda token)',
        'ToolbarMenu r22 (16+6) (:237-249)',
      ],
      fix: 'satu Card: varian card (r16) vs menu (r20/22). token border satu, jangan foreground 0.12 vs border 0.9.',
    },
    {
      pattern: 'pill floating surface dicopy 4x',
      where: [
        'AppHeader floatingSurface 4 blok identik h48 r24 (:202-297)',
        'SearchBar h48 r100 mirip tapi radius full (:37-52)',
        'ToolbarGroup h48 r24 (:199-207)',
      ],
      fix: 'satu Pill / FloatingSurface. AppHeader 4 cabang jadi 1 komponen + props icon + label.',
    },
  ],
  row: [
    {
      pattern: 'semua row polanya sama (icon + title flex1 + meta) tapi padding/radius beda',
      where: [
        'SettingsRow px-4 py-3 (:16-54)',
        'SpaceRow mx-2 rounded-xl px-3 py-2.5 (AppSidebar:25-70)',
        'NoteRow mx-2 mb-2 r16 (index:63-187)',
        'FolderRow r14 padV 11 + depth*20 (index:189-242)',
        'MoveSheet row r12 padH12 padV12 (:139-167)',
        'Hold MenuRow r14 (NoteHoldPreview:58-88)',
        'ToolbarMenu itemRow minH 48 (:678-696)',
      ],
      fix: 'satu ListRow: varian nav / note / folder / menu. padding + radius disatuin.',
    },
  ],
  text: [
    {
      pattern: 'PaperText vs raw Text campur + override liar',
      where: [
        'AppHeader pill Text 17 600 manual 4x (:216-306)',
        'EditorToolbar B/I/U/S 27/26, A 21, sheet title 16 — raw Text',
        'ToolbarMenu Text 16 500 (:187,362,436)',
        'nativewindui Text.tsx ga kepake sama sekali — mati',
      ],
      fix: 'pilih PaperText aja, ban raw Text buat label. nativewindui Text hapus. 17 600 pill + 18 600 note title jadiin token.',
    },
  ],
  sheet: [
    {
      pattern: 'bottom sheet gorhom dicopy 3x + modal custom 3x',
      where: [
        'CreateSpaceSheet snap 94% (:90-94,180-194)',
        'FolderNameSheet snap 40% — sama persis (:29-31,81-94)',
        'MoveSheet snap 60% + FlatList (:37-39,111-121)',
        'EditorToolbar sheet + link/image modal r24 + handle bar — 3x copy',
        'backdrop 3 rasa: 0.4 vs 0.2 vs dim themed',
      ],
      fix: 'satu Sheet wrapper (backdrop 0.4, r28, snap prop) + satu ModalSheet (r24 + handle bar).',
    },
  ],
  icon: [
    {
      pattern: '4 sistem ikon hidup bareng',
      where: [
        'MaterialSymbol — mayoritas, UI chrome',
        'SpaceIcon (lucide) — AppHeader, sidebar, move, folderrow. size 20/22 campur',
        'lucide langsung — cuma EditorToolbar',
        'nativewindui Icon — cuma modal.tsx, praktis mati',
      ],
      fix: 'MaterialSymbol buat chrome, SpaceIcon cuma buat icon space/folder user. lucide di toolbar migrasi ke MaterialSymbol.',
    },
  ],
};
