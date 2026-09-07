import {
  CoreBridge,
  PlaceholderBridge,
  RichText,
  TenTapStartKit,
  Toolbar,
  darkEditorTheme,
  defaultEditorTheme,
  useEditorBridge,
  type EditorBridge,
} from '@10play/tentap-editor';
import { useEffect, useMemo, useRef } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/lib/useColorScheme';

type NoteEditorProps = {
  initialBody?: string;
  placeholder?: string;
  autofocus?: boolean;
  editable?: boolean;
  onEditorReady?: (editor: EditorBridge) => void;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function plainTextToHtml(body: string): string {
  if (!body?.trim()) return '<p></p>';
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim());
  return paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
}

export function NoteEditor({
  initialBody = '',
  placeholder = 'Start writing...',
  autofocus = false,
  editable = true,
  onEditorReady,
}: NoteEditorProps) {
  const { colors, isDarkColorScheme } = useColorScheme();
  const readyFired = useRef(false);

  const customCss = useMemo(
    () => `
      * {
        background-color: transparent;
        color: ${colors.foreground};
      }
      .ProseMirror {
        padding: 0 20px 120px 20px;
        font-size: 16px;
        line-height: 1.65;
        caret-color: ${colors.primary};
      }
      .ProseMirror p {
        margin: 0 0 12px 0;
      }
      .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
        color: ${colors.foreground};
        font-weight: 700;
        line-height: 1.3;
      }
      .ProseMirror blockquote {
        border-left: 3px solid ${colors.border};
        padding-left: 12px;
        margin-left: 0;
        color: ${colors.mutedForeground};
      }
      .ProseMirror code {
        background-color: ${colors.muted};
        color: ${colors.foreground};
        border-radius: 4px;
        padding: 0 4px;
        font-size: 0.9em;
      }
      .ProseMirror pre {
        background-color: ${colors.muted};
        border-radius: 8px;
        padding: 12px;
      }
      .ProseMirror pre code {
        background-color: transparent;
        padding: 0;
      }
      .ProseMirror ul[data-type="taskList"] {
        padding-left: 0;
      }
      .is-editor-empty:first-child::before {
        color: ${colors.mutedForeground} !important;
      }
      a {
        color: ${colors.primary};
      }
    `,
    [colors]
  );

  const bridgeExtensions = useMemo(() => {
    const withPlaceholder = TenTapStartKit.map((ext: any) =>
      ext?.name === PlaceholderBridge.name
        ? PlaceholderBridge.configureExtension({ placeholder })
        : ext
    );
    return [...withPlaceholder, CoreBridge.configureCSS(customCss)];
  }, [customCss, placeholder]);

  const editorTheme = useMemo(
    () => ({
      ...(isDarkColorScheme ? darkEditorTheme : defaultEditorTheme),
      webview: {
        backgroundColor: colors.background,
      },
      toolbar: {
        ...((isDarkColorScheme ? darkEditorTheme : defaultEditorTheme).toolbar as object),
        toolbarBody: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderBottomColor: colors.border,
          borderTopWidth: 1,
          borderBottomWidth: 0,
        },
        toolbarButton: {
          backgroundColor: colors.card,
        },
        iconWrapper: {
          backgroundColor: colors.card,
          borderRadius: 6,
        },
        icon: {
          tintColor: colors.foreground,
        },
      },
    }),
    [colors, isDarkColorScheme]
  );

  const editor = useEditorBridge({
    autofocus,
    avoidIosKeyboard: true,
    initialContent: plainTextToHtml(initialBody),
    bridgeExtensions,
    theme: editorTheme,
    editable,
  });

  useEffect(() => {
    if (readyFired.current) return;
    readyFired.current = true;
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  return (
    <View style={styles.container}>
      <RichText editor={editor} style={{ flex: 1, backgroundColor: colors.background }} />
      {editable ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}>
          <Toolbar editor={editor} />
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
  },
});
