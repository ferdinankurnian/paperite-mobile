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
import { NodeSelection } from '@tiptap/pm/state';
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
    /** dipanggil native android (OnReceiveContentListener) buat nampilin
     *  image yang di-paste dari gboard. null di web/ios — aman diabaikan. */
    __paperiteReceiveImages?: (srcs: string[]) => void;
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
    // paste/drop image langsung jadi node image (base64 data URL).
    // sisi RN (lib/storage/note-images.ts) mindahin data URL ke file
    // assets/ pas save, jadi note.json tetap path relatif 1:1 desktop.
    handlePaste: (_view, event) => {
      const files: File[] = [];
      const items = event.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (!item.type.startsWith('image/')) continue;
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      // fallback: beberapa webview/browser naruh file di clipboardData.files.
      const rawFiles = event.clipboardData?.files;
      if (files.length === 0 && rawFiles) {
        for (const file of rawFiles) {
          if (file.type.startsWith('image/')) files.push(file);
        }
      }
      if (files.length === 0) return false;
      event.preventDefault();
      insertImageFiles(files);
      return true;
    },
    handleDrop: (_view, event) => {
      const files: File[] = [];
      const rawFiles = event.dataTransfer?.files;
      if (rawFiles) {
        for (const file of rawFiles) {
          if (file.type.startsWith('image/')) files.push(file);
        }
      }
      if (files.length === 0) return false;
      event.preventDefault();
      insertImageFiles(files);
      return true;
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

// tiap file dibaca async; insert satu-satu biar urutan paste/drop kejaga.
function insertImageFiles(files: File[]) {
  for (const file of files) {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') return;
      editor
        .chain()
        .focus()
        .setImage({ src: reader.result, alt: file.name || 'image' })
        .run();
    });
    reader.readAsDataURL(file);
  }
}

// jalur native android: gboard kirim commitContent → java baca bytes →
// base64 → manggil ini. insert kayak paste biasa, save ke assets/ diurus RN.
function receiveImageDataUrls(srcs: string[]) {
  for (const src of srcs) {
    if (!src.startsWith('data:image/')) continue;
    editor.chain().focus().setImage({ src, alt: 'pasted image' }).run();
  }
}

window.__paperiteReceiveImages = receiveImageDataUrls;

// tap / hold (touch) / klik-kanan (mouse) di gambar → select node +
// overlay aksi. teks biasa ga disentuh: fokus & menu native biarin.
function imgFromTarget(target: EventTarget | null): HTMLImageElement | null {
  if (target instanceof HTMLImageElement) return target;
  if (target instanceof HTMLElement) {
    const img = target.closest('img');
    return img instanceof HTMLImageElement ? img : null;
  }
  return null;
}

let lastImageMenuAt = 0;
let overlayImg: HTMLImageElement | null = null;

const overlay = document.createElement('div');
overlay.id = 'image-overlay';
overlay.setAttribute('data-show', 'false');
overlay.innerHTML =
  '<button type="button" data-size="small">S</button>' +
  '<button type="button" data-size="medium">M</button>' +
  '<button type="button" data-size="large">L</button>' +
  '<button type="button" data-size="original">1:1</button>' +
  '<span class="sep"></span>' +
  '<button type="button" data-action="delete" class="danger" aria-label="Delete image">' +
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' +
  '</button>';
document.body.appendChild(overlay);

// pointerdown di overlay jangan sampe ngerusak selection gambar.
overlay.addEventListener('pointerdown', (e) => e.preventDefault());
overlay.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  if (btn.dataset.action === 'delete') {
    deleteSelectedImage();
    return;
  }
  const preset = btn.dataset.size as ImagePreset | undefined;
  if (preset) {
    applyImageSize(preset);
    refreshOverlay();
  }
});

function currentPreset(): ImagePreset | null {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== 'image') {
    return null;
  }
  const width = selection.node.attrs.width;
  if (typeof width !== 'number' || !Number.isFinite(width)) return 'original';
  const container = document.getElementById('editor');
  const containerWidth = container?.clientWidth || editor.view.dom.clientWidth || width;
  const frac = width / containerWidth;
  const cands: readonly (readonly [ImagePreset, number])[] = [
    ['small', 1 / 3],
    ['medium', 2 / 3],
    ['large', 1],
  ];
  let best: ImagePreset = 'small';
  let bestDist = Infinity;
  for (const [preset, target] of cands) {
    const dist = Math.abs(frac - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = preset;
    }
  }
  return best;
}

function refreshOverlay() {
  if (!overlayImg) return;
  const active = currentPreset();
  overlay.querySelectorAll('button[data-size]').forEach((btn) => {
    const el = btn as HTMLButtonElement;
    el.setAttribute('data-active', String(el.dataset.size === active));
  });
  // ukur dulu (invisible) baru posisi — biar ga ngaco pas pertama muncul.
  overlay.style.visibility = 'hidden';
  overlay.setAttribute('data-show', 'true');
  const r = overlayImg.getBoundingClientRect();
  const w = overlay.offsetWidth;
  const h = overlay.offsetHeight;
  const left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - w - 8));
  // cukup ruang di atas = nempel atas gambar, kalo mepet status bar taruh bawah.
  const top = r.top > h + 16 ? r.top - h - 8 : r.bottom + 8;
  overlay.style.left = `${Math.round(left)}px`;
  overlay.style.top = `${Math.round(top)}px`;
  overlay.style.visibility = '';
}

function showOverlay(img: HTMLImageElement) {
  overlayImg = img;
  refreshOverlay();
}

function hideOverlay() {
  overlayImg = null;
  overlay.setAttribute('data-show', 'false');
}

function selectImage(img: HTMLImageElement) {
  // timer hold + contextmenu bisa kepanggil berurutan — cukup sekali.
  const now = Date.now();
  if (now - lastImageMenuAt < 800) return;
  lastImageMenuAt = now;
  try {
    const pos = editor.view.posAtDOM(img, 0);
    const $pos = editor.state.doc.resolve(pos);
    // img = leaf node: posAtDOM bisa di kiri/kanan node-nya, cek dua sisi.
    let nodePos: number | null = null;
    if ($pos.nodeAfter?.type.name === 'image') nodePos = pos;
    else if ($pos.nodeBefore?.type.name === 'image') {
      nodePos = pos - $pos.nodeBefore.nodeSize;
    }
    if (nodePos === null) return;
    editor.commands.setNodeSelection(nodePos);
    showOverlay(img);
  } catch {
    // dom lagi transisi — abaikan, ulangi hold-nya aja.
  }
}

// seleksi pindah dari gambar (tap teks / habis delete / undo) = tutup.
editor.on('selectionUpdate', () => {
  if (!overlayImg) return;
  const { selection } = editor.state;
  if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
    refreshOverlay();
    return;
  }
  hideOverlay();
});

window.addEventListener('scroll', () => refreshOverlay(), { passive: true });
window.addEventListener('resize', () => refreshOverlay(), { passive: true });

editor.view.dom.addEventListener('contextmenu', (e) => {
  const img = imgFromTarget(e.target);
  if (!img) return;
  e.preventDefault();
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  selectImage(img);
});

// tap gambar = select + overlay, TANPA keyboard. tap nge-focus editor
// (itu yang naikin keyboard) — cegat pointerdown khusus sentuhan.
// select-nya langsung di sini (bukan di click) soalnya preventDefault
// pointerdown nge-suppress compat mouse events termasuk click.
// mouse desktop sengaja ga dicegat biar drag & focus biasa tetep jalan.
editor.view.dom.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  const img = imgFromTarget(e.target);
  if (!img) return;
  e.preventDefault();
  selectImage(img);
});

editor.view.dom.addEventListener('click', (e) => {
  const img = imgFromTarget(e.target);
  if (!img) return;
  selectImage(img);
});

let holdTimer: ReturnType<typeof setTimeout> | null = null;
let holdX = 0;
let holdY = 0;

editor.view.dom.addEventListener(
  'touchstart',
  (e) => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    const touch = e.touches[0];
    if (!touch) return;
    holdX = touch.clientX;
    holdY = touch.clientY;
    const el = document.elementFromPoint(holdX, holdY);
    const img = imgFromTarget(el);
    if (!img) return;
    holdTimer = setTimeout(() => {
      holdTimer = null;
      selectImage(img);
    }, 550);
  },
  { passive: true }
);

const cancelHold = (e: TouchEvent) => {
  if (!holdTimer) return;
  const touch = e.touches[0];
  // jari geser > 10px = niat scroll, bukan hold.
  if (touch && Math.hypot(touch.clientX - holdX, touch.clientY - holdY) > 10) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
};

editor.view.dom.addEventListener('touchmove', cancelHold, { passive: true });
editor.view.dom.addEventListener('touchend', () => {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
});
editor.view.dom.addEventListener('touchcancel', () => {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
});

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
  deleteImage: () => deleteSelectedImage(),
  setImageSize: (preset: unknown) => applyImageSize(preset as ImagePreset),
};

type ImagePreset = 'small' | 'medium' | 'large' | 'original';

function selectedImage(): { nodePos: number } | null {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== 'image') {
    return null;
  }
  return { nodePos: selection.from };
}

function deleteSelectedImage() {
  if (selectedImage()) {
    editor.commands.deleteSelection();
  }
}

function applyImageSize(preset: ImagePreset) {
  if (!selectedImage()) return;
  // original = lepas attr, balik ke natural size. preset lain = pixel
  // relatif ke lebar editor — semantik sama kayak resize desktop.
  if (preset === 'original') {
    editor.commands.updateAttributes('image', { width: null, height: null });
    return;
  }
  const container = document.getElementById('editor');
  const containerWidth = container?.clientWidth || editor.view.dom.clientWidth || 0;
  if (!containerWidth) return;
  const frac = preset === 'small' ? 1 / 3 : preset === 'medium' ? 2 / 3 : 1;
  const px = Math.max(120, Math.min(containerWidth, Math.round(containerWidth * frac)));
  editor.commands.updateAttributes('image', { width: px, height: null });
}

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
