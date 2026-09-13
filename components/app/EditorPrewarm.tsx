import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { EDITOR_HTML } from '@/lib/editor/tiptap-bundle';

// mesin editor dipanasin sekali pas app dibuka. webview ini ga pernah
// megang isi note sama sekali, cuma load bundle tiptap biar prosesnya
// panas. jadi ga mungkin ketabrak antar note. webview asli per note
// tetap dibuat pas note dibuka, tapi boot-nya jauh lebih cepet karena
// proses + js engine udah anget.
export function EditorPrewarm() {
  const startedRef = useRef(0);
  useEffect(() => {
    startedRef.current = Date.now();
  }, []);

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0 }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: EDITOR_HTML }}
        javaScriptEnabled
        domStorageEnabled={false}
        scrollEnabled={false}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg?.type === 'ready') {
              console.info(
                `[paperite perf] editor engine warm ${Date.now() - startedRef.current}ms`
              );
            }
          } catch {
            // pesan asing — abaikan.
          }
        }}
      />
    </View>
  );
}
