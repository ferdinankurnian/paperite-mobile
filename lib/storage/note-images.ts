// image assets per note: noteDirByPath(notePath)/assets/.
// di note.json src disimpan RELATIF ("assets/img-<hash>.png") 1:1 sama
// desktop — desktop resolve ke file:// via electron, mobile resolve ke
// data URL (webview inline html ga bisa baca file:// dengan andal).
//
// dua arah, dua tempat:
// - resolve (storage → display): TipTapEditor, sekali pas mount.
// - denormalize (display → storage): createNote/updateNote, tiap save.
// nama file deterministik dari hash isi → gambar sama = file sama,
// ga ada duplikat, roundtrip resolve→save balik ke path yang sama.

import { Directory, File } from 'expo-file-system';

import { ASSETS_DIRNAME, noteDirByPath } from './files';

export function noteAssetsDir(notePath: string): Directory {
  return new Directory(noteDirByPath(notePath), ASSETS_DIRNAME);
}

/** compat lama (spaceId+noteId flat) — kode baru pake notePath langsung. */
export function noteAssetsDirByIds(spaceId: string, noteId: string): Directory {
  return noteAssetsDir(`${spaceId}/${noteId}`);
}

export function isDataUrl(src: string): boolean {
  return src.startsWith('data:image/');
}

/** mirror desktop (note-editor.tsx :: isRelativeAssetSrc) + content:// android. */
export function isRelativeAssetSrc(src: string): boolean {
  return (
    !src.startsWith('data:') &&
    !src.startsWith('http://') &&
    !src.startsWith('https://') &&
    !src.startsWith('file://') &&
    !src.startsWith('content://') &&
    !src.startsWith('/')
  );
}

type ParsedDataUrl = { mime: string; ext: string; base64: string };

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
};

export function parseDataUrl(src: string): ParsedDataUrl | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(src.trim());
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const ext = MIME_TO_EXT[mime] ?? mime.slice('image/'.length).replace(/[^a-z0-9]/g, '') ?? 'png';
  return { mime, ext: ext || 'png', base64: match[2] };
}

export function mimeForExt(ext: string): string {
  const lower = ext.toLowerCase().replace(/^\./, '');
  if (lower === 'jpg' || lower === 'jpeg') return 'image/jpeg';
  if (lower === 'svg') return 'image/svg+xml';
  if (!lower) return 'image/png';
  return `image/${lower}`;
}

/** cyrb53 — hash string 53-bit, cukup buat dedupe file per note. */
export function hashBase64(base64: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < base64.length; i++) {
    const ch = base64.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// hash file yang udah ada di disk, cache by size+mtime biar save
// berulang (autosave tiap ketik) ga baca ulang file yang sama.
const fileHashCache = new Map<string, { size: number; mtime: number | null; hash: string }>();

async function hashAssetFile(file: File): Promise<string | null> {
  try {
    const size = file.size;
    if (!size) return null;
    const mtime = file.modificationTime;
    const cached = fileHashCache.get(file.uri);
    if (cached && cached.size === size && cached.mtime === mtime) return cached.hash;
    const base64 = await file.base64();
    const hash = hashBase64(base64);
    fileHashCache.set(file.uri, { size, mtime, hash });
    return hash;
  } catch {
    return null;
  }
}

/**
 * tulis data URL ke assets/, balikin path relatif ("assets/img-<hash>.ext").
 * file sama (hash sama + ext sama) = reuse, ga ditulis ulang.
 * dipakai langsung buat hasil gallery/clipboard; denormalize juga lewat sini.
 */
export async function saveDataUrlToAssets(
  notePath: string,
  dataUrl: string
): Promise<string | null> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  try {
    const dir = noteAssetsDir(notePath);
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const name = `img-${hashBase64(parsed.base64)}.${parsed.ext}`;
    const file = new File(dir, name);
    if (!file.exists) {
      file.create();
      file.write(parsed.base64, { encoding: 'base64' });
    }
    return `${ASSETS_DIRNAME}/${name}`;
  } catch {
    return null;
  }
}

/** cari file assets yang isinya sama persis (hash match). */
async function findAssetByHash(notePath: string, hash: string): Promise<string | null> {
  try {
    const dir = noteAssetsDir(notePath);
    if (!dir.exists) return null;
    for (const entry of dir.list()) {
      if (!(entry instanceof File)) continue;
      if ((await hashAssetFile(entry)) === hash) {
        return `${ASSETS_DIRNAME}/${entry.name}`;
      }
    }
  } catch {
    // dir ga bisa dibaca — anggap ga ketemu, nanti save baru.
  }
  return null;
}

type DocNode = Record<string, unknown>;

async function walkNodes(
  nodes: DocNode[],
  fn: (src: string) => Promise<string>
): Promise<DocNode[]> {
  let changed = false;
  const out = await Promise.all(
    nodes.map(async (node) => {
      let next = node;
      const attrs = node.attrs as Record<string, unknown> | undefined;
      if (node.type === 'image' && attrs && typeof attrs.src === 'string') {
        const replaced = await fn(attrs.src);
        if (replaced !== attrs.src) {
          next = { ...node, attrs: { ...attrs, src: replaced } };
        }
      }
      const children = next.content;
      if (Array.isArray(children)) {
        const mapped = await walkNodes(children as DocNode[], fn);
        if (mapped.some((child, i) => child !== (children as unknown[])[i])) {
          next = { ...next, content: mapped };
        }
      }
      if (next !== node) changed = true;
      return next;
    })
  );
  return changed ? out : nodes;
}

/**
 * storage → display: path relatif jadi data URL biar webview bisa render.
 * file hilang / src asing = dibiarin apa adanya (desktop yang resolve nanti).
 */
export async function resolveDocForDisplay<T extends { content?: DocNode[] }>(
  notePath: string,
  doc: T
): Promise<T> {
  if (!doc.content) return doc;
  const content = await walkNodes(doc.content, async (src) => {
    if (!isRelativeAssetSrc(src)) return src;
    try {
      const file = new File(noteDirByPath(notePath), src);
      if (!file.exists) return src;
      const base64 = await file.base64();
      return `data:${mimeForExt(file.extension)};base64,${base64}`;
    } catch {
      return src;
    }
  });
  return content === doc.content ? doc : { ...doc, content };
}

/**
 * display → storage: data URL jadi path relatif (tulis file kalau baru).
 * reuse file yang isinya sama — termasuk file nama-original dari desktop.
 */
export async function denormalizeDocForStorage<T extends { content?: DocNode[] }>(
  notePath: string,
  doc: T
): Promise<T> {
  if (!doc.content) return doc;
  const content = await walkNodes(doc.content, async (src) => {
    if (!isDataUrl(src)) return src;
    const parsed = parseDataUrl(src);
    if (!parsed) return src;
    const hash = hashBase64(parsed.base64);
    // deterministik dulu (O(1)) — kebanyakan roundtrip kena sini.
    const expected = `${ASSETS_DIRNAME}/img-${hash}.${parsed.ext}`;
    try {
      if (new File(noteAssetsDir(notePath), `img-${hash}.${parsed.ext}`).exists) {
        return expected;
      }
    } catch {
      // lanjut ke scan / save.
    }
    const existing = await findAssetByHash(notePath, hash);
    if (existing) return existing;
    return (await saveDataUrlToAssets(notePath, src)) ?? src;
  });
  return content === doc.content ? doc : { ...doc, content };
}
