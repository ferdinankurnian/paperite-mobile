// format note.json di disk — kompatibel sama desktop (~/Projects/paperite).
// desktop nyimpen tiap note sebagai folder isi note.json (tiptap doc + title)
// + folder assets/. mobile v1 pake struktur yang sama, jadi nanti sync
// tinggal copy folder, ga perlu migrasi format.

export type NoteDocNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: NoteDocNode[];
  [key: string]: unknown;
};

export type NoteDoc = {
  id: string;
  type: 'doc';
  title: string;
  content: NoteDocNode[];
  updatedAt: number;
  [key: string]: unknown;
};

export function textToDoc(text: string, id: string, title: string, updatedAt: number): NoteDoc {
  const blocks = text.split(/\r?\n/).map((line) => ({
    type: 'paragraph' as const,
    ...(line ? { content: [{ type: 'text', text: line }] } : {}),
  }));
  return {
    id,
    type: 'doc',
    title,
    content: blocks.length > 0 ? blocks : [{ type: 'paragraph' }],
    updatedAt,
  };
}

function collectText(node: NoteDocNode | undefined, chunks: string[]) {
  if (!node) return;
  if (typeof node.text === 'string') chunks.push(node.text);
  for (const child of node.content ?? []) collectText(child, chunks);
  if (
    node.type === 'paragraph' ||
    node.type === 'heading' ||
    node.type === 'blockquote' ||
    node.type === 'codeBlock' ||
    node.type === 'listItem' ||
    node.type === 'taskItem'
  ) {
    if (chunks[chunks.length - 1] !== '\n') chunks.push('\n');
  }
}

export function docToText(doc: Pick<NoteDoc, 'content'>): string {
  const chunks: string[] = [];
  collectText({ type: 'doc', content: doc.content ?? [] }, chunks);
  return chunks.join('').replace(/\n+$/g, '');
}

export function docPreview(doc: Pick<NoteDoc, 'content'>): string {
  return (
    docToText(doc)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ''
  );
}

/** html dari tentap bridge → plain text buat disimpan ke note.json. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote|pre|ul|ol|div|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
