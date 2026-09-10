// bundle editor-web/ (tiptap ori) jadi SATU file html self-contained,
// terus bungkus jadi modul TS (lib/editor/tiptap-bundle.ts) biar metro
// bisa import sync tanpa config asset tambahan.
// jalanin: bun run build:editor  (wajib habis ubah editor-web/)
//
// kenapa inline, bukan file terpisah: webview di expo paling gampang
// di-feed `source={{ html }}` — ga ada urusan file:// path, CORS,
// atau metro assetExts. bundle ~ratusan KB, sekali load per mount.

import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const result = await build({
  entryPoints: [join(root, 'editor-web', 'editor.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome90'],
  write: false,
});

const js = result.outputFiles[0].text;
const css = readFileSync(join(root, 'editor-web', 'editor.css'), 'utf8');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<style>${css}</style>
</head>
<body>
<div id="title" contenteditable="plaintext-only" spellcheck="false" data-placeholder="Title"></div>
<div id="editor"></div>
<script>${js.replace(/<\/script>/g, '<\\/script>')}</script>
</body>
</html>`;

mkdirSync(join(root, 'lib', 'editor'), { recursive: true });
writeFileSync(
  join(root, 'lib', 'editor', 'tiptap-bundle.ts'),
  `// GENERATED — jangan edit manual. sumber: editor-web/. ` +
    `regen: bun run build:editor\n` +
    `export const EDITOR_HTML = ${JSON.stringify(html)};\n`
);

console.log(`[build:editor] ${(html.length / 1024).toFixed(0)} KB -> lib/editor/tiptap-bundle.ts`);
