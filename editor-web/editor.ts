// jalan di DALEM webview (bukan RN). dibundle esbuild jadi satu file
// terus di-inline ke lib/editor/tiptap-bundle.ts.
// schema extensions mirror desktop (paperite/src/components/note-editor.tsx
// :: createBaseExtensions) MINUS yang desktop-only:
// - Collaboration (Y.Doc nyusul pas collab space — format note.json sama,
//   jadi nambah extension nanti ga butuh migrasi)
// - NodeView custom (codeblock render, image resize UI)
// - suggestion/emoji, search highlight, title nav
// wire format note.json tetap TipTap JSON 1:1 sama desktop.

import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { Editor } from '@tiptap/core';

type Outgoing =
  | { type: 'ready' }
  | { type: 'update'; json: unknown; text: string }
  | { type: 'title'; text: string }
  | { type: 'state'; state: Record<string, unknown> }
  | { type: 'response'; id: number; value: unknown };

type Incoming =
  | { type: 'setContent'; doc: unknown }
  | { type: 'setTitle'; text: string }
  | { type: 'focus'; target?: 'title' | 'editor'; pos?: 'start' | 'end' }
  | { type: 'command'; name: string; args?: unknown[] }
  | { type: 'get'; id: number; what: 'json' | 'text' | 'html' | 'title' }
  | { type: 'theme'; cssVars: Record<string, string>; placeholder: string };

declare global {
  interface Window {
    __paperiteReady?: boolean;
  }
}

const post = (msg: Outgoing) => {
  window.ReactNativeWebView?.postMessage(JSON.stringify(msg));
};

const editor = new Editor({
  element: document.getElementById('editor')!,
  extensions: [
    StarterKit.configure({
      underline: false,
      codeBlock: false,
    }),
    Underline,
    TextStyle.configure({
      mergeNestedSpanStyles: true,
    }),
    Color,
    Highlight.configure({ multicolor: true }),
    Image.configure({
      allowBase64: true,
    }),
    Link.configure({
      autolink: true,
      defaultProtocol: 'https',
      linkOnPaste: true,
      openOnClick: false,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
  ],
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  autofocus: false,
  editable: true,
  editorProps: {
    attributes: {
      id: 'paperite-prosemirror',
    },
  },
  onUpdate: () => {
    scheduleUpdate();
    postState();
  },
  onSelectionUpdate: () => {
    postState();
  },
});

let updateTimer: ReturnType<typeof setTimeout> | null = null;
let titleTimer: ReturnType<typeof setTimeout> | null = null;

const titleEl = document.getElementById('title') as HTMLElement;

function readTitle(): string {
  // innerText selalu plain — walau webview fallback ke rich editing
  // (plaintext-only ga support), yang keluar tetap teks polos 1 baris.
  return (titleEl.innerText ?? '').replace(/\n+/g, ' ').trim();
}

function paintTitleEmpty() {
  titleEl.setAttribute('data-empty', readTitle() ? 'false' : 'true');
}

function setTitleText(text: string) {
  if (readTitle() === text) return;
  titleEl.innerText = text;
  paintTitleEmpty();
}

titleEl.addEventListener('input', () => {
  paintTitleEmpty();
  if (titleTimer) clearTimeout(titleTimer);
  titleTimer = setTimeout(() => {
    titleTimer = null;
    post({ type: 'title', text: readTitle() });
  }, 400);
});

// judul satu baris: enter = lompat ke isi, bukan newline.
titleEl.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    editor.commands.focus('start');
  }
  paintTitleEmpty();
});

function scheduleUpdate() {
  if (updateTimer) clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    updateTimer = null;
    try {
      post({ type: 'update', json: editor.getJSON(), text: editor.getText() });
    } catch {
      // editor lagi transisi (setContent) — update berikutnya yang menang.
    }
    paintRoomy();
  }, 400);
}

// dead scroll = musuh. padding bawah lega cuma dipasang kalau konten
// udah lewat setengah layar — note pendek berhenti pas, ga bisa scroll.
function paintRoomy() {
  try {
    const h = (editor.view.dom as HTMLElement).scrollHeight + titleEl.scrollHeight;
    document.body.dataset.roomy = String(h > window.innerHeight * 0.5);
  } catch {
    // dom belum siap — update berikutnya yang ngitung.
  }
}

window.addEventListener('resize', paintRoomy);

function activeStates(): Record<string, unknown> {
  const headingLevel = editor.isActive('heading', { level: 1 })
    ? 1
    : editor.isActive('heading', { level: 2 })
      ? 2
      : editor.isActive('heading', { level: 3 })
        ? 3
        : 0;
  return {
    isBoldActive: editor.isActive('bold'),
    isItalicActive: editor.isActive('italic'),
    isUnderlineActive: editor.isActive('underline'),
    isStrikeActive: editor.isActive('strike'),
    isCodeActive: editor.isActive('code'),
    isBulletListActive: editor.isActive('bulletList'),
    isOrderedListActive: editor.isActive('orderedList'),
    isTaskListActive: editor.isActive('taskList'),
    isBlockquoteActive: editor.isActive('blockquote'),
    isLinkActive: editor.isActive('link'),
    activeLink: editor.getAttributes('link').href ?? null,
    activeHighlight: editor.getAttributes('highlight').color ?? null,
    activeColor: editor.getAttributes('textStyle').color ?? null,
    headingLevel,
    textAlign:
      editor.getAttributes('paragraph').textAlign ??
      editor.getAttributes('heading').textAlign ??
      'left',
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
  };
}

function postState() {
  try {
    post({ type: 'state', state: activeStates() });
  } catch {
    // ignore — RN sinkronisasi ulang pas update berikutnya.
  }
}

const commands: Record<string, (...args: unknown[]) => void> = {
  focus: () => editor.commands.focus(),
  blur: () => editor.commands.blur(),
  undo: () => editor.commands.undo(),
  redo: () => editor.commands.redo(),
  toggleBold: () => editor.chain().focus().toggleBold().run(),
  toggleItalic: () => editor.chain().focus().toggleItalic().run(),
  toggleUnderline: () => editor.chain().focus().toggleUnderline().run(),
  toggleStrike: () => editor.chain().focus().toggleStrike().run(),
  toggleCode: () => editor.chain().focus().toggleCode().run(),
  toggleHeading: (level: unknown) => {
    const l = level as 1 | 2 | 3;
    editor.chain().focus().toggleHeading({ level: l }).run();
  },
  clearHeading: () => {
    ([1, 2, 3] as const).forEach((l) => {
      if (editor.isActive('heading', { level: l })) {
        editor.chain().focus().toggleHeading({ level: l }).run();
      }
    });
  },
  toggleBulletList: () => editor.chain().focus().toggleBulletList().run(),
  toggleOrderedList: () => editor.chain().focus().toggleOrderedList().run(),
  toggleTaskList: () => editor.chain().focus().toggleTaskList().run(),
  toggleBlockquote: () => editor.chain().focus().toggleBlockquote().run(),
  toggleCodeBlock: () => editor.chain().focus().toggleCodeBlock().run(),
  setTextAlign: (alignment: unknown) =>
    editor
      .chain()
      .focus()
      .setTextAlign(alignment as 'left' | 'center' | 'right' | 'justify')
      .run(),
  setColor: (color: unknown) =>
    editor
      .chain()
      .focus()
      .setColor(color as string)
      .run(),
  unsetColor: () => editor.chain().focus().unsetColor().run(),
  setHighlight: (color: unknown) =>
    editor
      .chain()
      .focus()
      .toggleHighlight({ color: color as string })
      .run(),
  toggleHighlight: (color: unknown) =>
    editor
      .chain()
      .focus()
      .toggleHighlight({ color: color as string })
      .run(),
  unsetHighlight: () => editor.chain().focus().unsetHighlight().run(),
  setLink: (url: unknown) => {
    if (!url) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .setLink({ href: url as string })
      .run();
  },
  setImage: (src: unknown) => {
    editor
      .chain()
      .focus()
      .setImage({ src: src as string })
      .run();
  },
};

function applyTheme(cssVars: Record<string, string>, placeholder: string) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(cssVars)) {
    root.style.setProperty(key, value);
  }
  const el = document.getElementById('editor');
  el?.setAttribute('data-placeholder', placeholder);
}

function handleMessage(data: unknown) {
  const msg = data as Incoming;
  try {
    switch (msg.type) {
      case 'setContent': {
        editor.commands.setContent(msg.doc as never, { emitUpdate: false });
        postState();
        setTimeout(paintRoomy, 0);
        break;
      }
      case 'setTitle': {
        setTitleText(msg.text);
        break;
      }
      case 'focus': {
        if (msg.target === 'title') {
          titleEl.focus();
          // caret ke ujung judul.
          const range = document.createRange();
          range.selectNodeContents(titleEl);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        } else if (msg.pos === 'start') editor.commands.focus('start');
        else if (msg.pos === 'end') editor.commands.focus('end');
        else editor.commands.focus();
        break;
      }
      case 'command': {
        commands[msg.name]?.(...(msg.args ?? []));
        // state aktif di-push balik via onSelectionUpdate/onUpdate kebanyakan
        // kasus, tapi command tanpa perubahan seleksi (misal undo) butuh ini.
        setTimeout(postState, 0);
        break;
      }
      case 'get': {
        let value: unknown = null;
        if (msg.what === 'json') value = editor.getJSON();
        else if (msg.what === 'text') value = editor.getText();
        else if (msg.what === 'html') value = editor.getHTML();
        else if (msg.what === 'title') value = readTitle();
        post({ type: 'response', id: msg.id, value });
        break;
      }
      case 'theme': {
        applyTheme(msg.cssVars, msg.placeholder);
        break;
      }
    }
  } catch {
    // command gagal (misal editor belum siap) — RN yang retry/timeout.
  }
}

// RN postMessage masuk sini; dobel listener buat android lama + baru.
document.addEventListener('message', (e: Event) => {
  try {
    handleMessage(JSON.parse((e as MessageEvent).data));
  } catch {
    // bukan json kita — abaikan.
  }
});
window.addEventListener('message', (e: MessageEvent) => {
  try {
    handleMessage(JSON.parse(e.data as string));
  } catch {
    // bukan json kita — abaikan.
  }
});

post({ type: 'ready' });
paintTitleEmpty();
paintRoomy();
window.__paperiteReady = true;
