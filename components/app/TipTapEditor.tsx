import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { EditorToolbar } from '@/components/app/EditorToolbar';
import { EDITOR_HTML } from '@/lib/editor/tiptap-bundle';
import {
  EMPTY_EDITOR_STATE,
  type EditorActiveState,
  type MobileEditor,
  type TipTapDoc,
} from '@/lib/editor/types';
import { useColorScheme } from '@/lib/useColorScheme';

type TipTapEditorProps = {
  initialContent?: TipTapDoc;
  title?: string;
  placeholder?: string;
  autofocus?: boolean;
  /** new note: fokus ke judul dulu, bukan ke isi. */
  autofocusTitle?: boolean;
  /** padding atas konten web (px) buat ngindarin header overlay.
   *  [id] kirim tinggi header, new.tsx 0 (layout manual di atas webview). */
  contentTopPadding?: number;
  onReady?: (editor: MobileEditor) => void;
  /** json + text terbaru, udah di-debounce 400ms di sisi web. */
  onContentChange?: (doc: TipTapDoc, text: string) => void;
  onTitleChange?: (title: string) => void;
};

type PendingRequest = {
  resolve: (value: never) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const EMPTY_DOC: TipTapDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

export function TipTapEditor({
  initialContent = EMPTY_DOC,
  title = '',
  placeholder = 'Start writing...',
  autofocus = false,
  autofocusTitle = false,
  contentTopPadding = 0,
  onReady,
  onContentChange,
  onTitleChange,
}: TipTapEditorProps) {
  const { colors } = useColorScheme();
  const webviewRef = useRef<WebView>(null);
  const [editorState, setEditorState] = useState<EditorActiveState>(EMPTY_EDITOR_STATE);
  const readyRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const pendingRef = useRef(new Map<number, PendingRequest>());
  const reqIdRef = useRef(1);
  const onContentChangeRef = useRef(onContentChange);
  const onTitleChangeRef = useRef(onTitleChange);
  const onReadyRef = useRef(onReady);
  const initialContentRef = useRef(initialContent);
  const initialTitleRef = useRef(title);
  const placeholderRef = useRef(placeholder);
  const autofocusRef = useRef(autofocus);
  const autofocusTitleRef = useRef(autofocusTitle);
  const [webReady, setWebReady] = useState(false);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);
  useEffect(() => {
    onTitleChangeRef.current = onTitleChange;
  }, [onTitleChange]);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const cssVars = useMemo(
    () => ({
      '--bg': colors.background,
      '--fg': colors.foreground,
      '--muted': colors.mutedForeground,
      '--primary': colors.primary,
      '--code-bg': colors.muted,
      '--border': colors.border,
      '--safe-top': `${contentTopPadding}px`,
    }),
    [colors, contentTopPadding]
  );
  const cssVarsRef = useRef(cssVars);
  useEffect(() => {
    cssVarsRef.current = cssVars;
    if (readyRef.current) {
      send({ type: 'theme', cssVars, placeholder: placeholderRef.current });
    }
  }, [cssVars]);

  function send(msg: unknown) {
    const json = JSON.stringify(msg);
    if (!readyRef.current) {
      queueRef.current.push(json);
      return;
    }
    webviewRef.current?.postMessage(json);
  }

  function flushQueue() {
    const queued = queueRef.current;
    queueRef.current = [];
    for (const json of queued) {
      webviewRef.current?.postMessage(json);
    }
  }

  function request<T>(what: 'json' | 'text' | 'html' | 'title'): Promise<T> {
    const id = reqIdRef.current++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRef.current.delete(id);
        reject(new Error('editor request timeout'));
      }, 5000);
      pendingRef.current.set(id, {
        resolve: resolve as (value: never) => void,
        reject,
        timer,
      });
      send({ type: 'get', id, what });
    });
  }

  const api = useMemo<MobileEditor>(() => {
    const command = (name: string, ...args: unknown[]) => send({ type: 'command', name, args });
    return {
      focus: (pos) => send({ type: 'focus', ...(pos ? { pos } : {}) }),
      focusTitle: () => send({ type: 'focus', target: 'title' }),
      blur: () => command('blur'),
      undo: () => command('undo'),
      redo: () => command('redo'),
      getText: () => request<string>('text'),
      getTitle: () => request<string>('title'),
      getHTML: () => request<string>('html'),
      getJSON: () => request<TipTapDoc>('json'),
      setContent: (doc) => send({ type: 'setContent', doc }),
      toggleBold: () => command('toggleBold'),
      toggleItalic: () => command('toggleItalic'),
      toggleUnderline: () => command('toggleUnderline'),
      toggleStrike: () => command('toggleStrike'),
      toggleCode: () => command('toggleCode'),
      toggleHeading: (level) => command('toggleHeading', level),
      clearHeading: () => command('clearHeading'),
      toggleBulletList: () => command('toggleBulletList'),
      toggleOrderedList: () => command('toggleOrderedList'),
      toggleTaskList: () => command('toggleTaskList'),
      toggleBlockquote: () => command('toggleBlockquote'),
      toggleCodeBlock: () => command('toggleCodeBlock'),
      setTextAlign: (alignment) => command('setTextAlign', alignment),
      setColor: (color) => command('setColor', color),
      unsetColor: () => command('unsetColor'),
      setHighlight: (color) => command('setHighlight', color),
      toggleHighlight: (color) => command('toggleHighlight', color),
      unsetHighlight: () => command('unsetHighlight'),
      setLink: (url) => command('setLink', url),
      setImage: (src) => command('setImage', src),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMessage = (event: WebViewMessageEvent) => {
    let msg: {
      type: string;
      json?: TipTapDoc;
      text?: string;
      state?: EditorActiveState;
      id?: number;
      value?: never;
    };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'ready': {
        readyRef.current = true;
        send({ type: 'theme', cssVars: cssVarsRef.current, placeholder: placeholderRef.current });
        send({ type: 'setContent', doc: initialContentRef.current });
        send({ type: 'setTitle', text: initialTitleRef.current });
        setWebReady(true);
        if (autofocusTitleRef.current) {
          setTimeout(() => send({ type: 'focus', target: 'title' }), 350);
        } else if (autofocusRef.current) {
          // kasih webview waktu nempel dulu sebelum keyboard dipanggil.
          setTimeout(() => send({ type: 'focus', pos: 'end' }), 350);
        }
        flushQueue();
        onReadyRef.current?.(api);
        break;
      }
      case 'update': {
        if (msg.json) onContentChangeRef.current?.(msg.json, msg.text ?? '');
        break;
      }
      case 'title': {
        onTitleChangeRef.current?.(msg.text ?? '');
        break;
      }
      case 'state': {
        if (msg.state) setEditorState(msg.state);
        break;
      }
      case 'response': {
        if (msg.id === undefined) break;
        const pending = pendingRef.current.get(msg.id);
        if (!pending) break;
        pendingRef.current.delete(msg.id);
        clearTimeout(pending.timer);
        pending.resolve(msg.value as never);
        break;
      }
    }
  };

  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      for (const req of pending.values()) {
        clearTimeout(req.timer);
        req.reject(new Error('editor unmounted'));
      }
      pending.clear();
    };
  }, []);

  // safety net: kalau pesan ready nyangkut (bundle rusak dsb),
  // jangan blank selamanya — tampilin apa adanya setelah 2.5 dtk.
  useEffect(() => {
    if (webReady) return;
    const t = setTimeout(() => setWebReady(true), 2500);
    return () => clearTimeout(t);
  }, [webReady]);

  // disuntik SEBELUM html ke-parse: first paint langsung warna tema,
  // bukan putih default webview. ini yang bunuh flash silau di dark mode.
  const beforeLoadJS = useMemo(() => {
    const sets = Object.entries(cssVars)
      .map(([k, v]) => `document.documentElement.style.setProperty('${k}','${v}');`)
      .join('');
    return `${sets}true;`;
  }, [cssVars]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: EDITOR_HTML }}
        injectedJavaScriptBeforeContentLoaded={beforeLoadJS}
        style={{ flex: 1, backgroundColor: colors.background, opacity: webReady ? 1 : 0 }}
        containerStyle={{ backgroundColor: colors.background }}
        javaScriptEnabled
        domStorageEnabled={false}
        mediaPlaybackRequiresUserAction={false}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEnabled
        onMessage={onMessage}
      />
      {/* toolbar sticky full-bleed ala paperite-rn: nempel tepi bawah,
          safe-area diurus dalem EditorToolbar via bottomInset. */}
      <KeyboardStickyView
        offset={{ closed: 0, opened: 0 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -1,
        }}>
        <EditorToolbar editor={api} editorState={editorState} />
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
