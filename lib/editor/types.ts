// interface editor mobile — implementasi sekarang TipTap ori di webview.
// dulu interface ini dipenuhi tentap; nama method disamain biar toolbar,
// header, dan screen ga perlu rewrite pas ganti mesin.

export type TipTapDoc = {
  type: 'doc';
  content: Record<string, unknown>[];
  [key: string]: unknown;
};

export type EditorActiveState = {
  isBoldActive: boolean;
  isItalicActive: boolean;
  isUnderlineActive: boolean;
  isStrikeActive: boolean;
  isCodeActive: boolean;
  isBulletListActive: boolean;
  isOrderedListActive: boolean;
  isTaskListActive: boolean;
  isBlockquoteActive: boolean;
  isLinkActive: boolean;
  activeLink: string | null;
  activeHighlight: string | null;
  activeColor: string | null;
  headingLevel: 0 | 1 | 2 | 3;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  canUndo: boolean;
  canRedo: boolean;
};

export const EMPTY_EDITOR_STATE: EditorActiveState = {
  isBoldActive: false,
  isItalicActive: false,
  isUnderlineActive: false,
  isStrikeActive: false,
  isCodeActive: false,
  isBulletListActive: false,
  isOrderedListActive: false,
  isTaskListActive: false,
  isBlockquoteActive: false,
  isLinkActive: false,
  activeLink: null,
  activeHighlight: null,
  activeColor: null,
  headingLevel: 0,
  textAlign: 'left',
  canUndo: false,
  canRedo: false,
};

export type ImageSizePreset = 'small' | 'medium' | 'large' | 'original';

export type MobileEditor = {
  focus: (pos?: 'start' | 'end') => void;
  focusTitle: () => void;
  blur: () => void;
  undo: () => void;
  redo: () => void;
  getText: () => Promise<string>;
  getTitle: () => Promise<string>;
  getHTML: () => Promise<string>;
  getJSON: () => Promise<TipTapDoc>;
  setContent: (doc: TipTapDoc) => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleStrike: () => void;
  toggleCode: () => void;
  toggleHeading: (level: 1 | 2 | 3) => void;
  clearHeading: () => void;
  toggleBulletList: () => void;
  toggleOrderedList: () => void;
  toggleTaskList: () => void;
  toggleBlockquote: () => void;
  toggleCodeBlock: () => void;
  setTextAlign: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  setColor: (color: string) => void;
  unsetColor: () => void;
  setHighlight: (color: string) => void;
  toggleHighlight: (color: string) => void;
  unsetHighlight: () => void;
  setLink: (url: string | null) => void;
  setImage: (src: string) => void;
  deleteImage: () => void;
  setImageSize: (preset: ImageSizePreset) => void;
};
