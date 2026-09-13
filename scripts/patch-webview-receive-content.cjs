// gboard image paste (commitContent) ke webview.
// masalah: react-native-webview ga declare image/* di level native, jadi
// gboard nolak paste ("ne permet pas de coller des images ici") sebelum
// event-nya nyampe JS. handlePaste di editor.ts ga pernah kepanggil.
//
// v1 (MARKER): OnReceiveContentListener image/* di constructor — consume
//   item image (bytes → base64 → window.__paperiteReceiveImages), sisanya
//   balik ke webview biar paste teks biasa ga keganggu.
// v2 (MARKER_V2): override onCreateInputConnection — iklanin image/* ke IME
//   (EditorInfo.contentMimeTypes) + wrap connection biar commitContent
//   diarahin ke listener v1. tanpa ini gboard nolak duluan (baca mime kosong).
//
// pola sama kayak patch lain di repo ini (drawer spring, expo-router):
// patch node_modules, idempoten, di-apply ulang tiap postinstall.
// regen android/ (expo run / prebuild) ga ngaruh — gradle compile dari sini.
//
// target: react-native-webview@13.16.1 (exact di package.json).
// kalau source berubah (drift) script exit 1 biar ketauan pas install.

const fs = require('node:fs');

const MARKER = '[paperite-receive-content]';
const MARKER_V2 = '[paperite-receive-content-icc]';
const file =
  'node_modules/react-native-webview/android/src/main/java/com/reactnativecommunity/webview/RNCWebView.java';

if (!fs.existsSync(file)) {
  console.warn('[webview-receive-content] skip: file not found');
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8');

if (source.includes(MARKER_V2)) {
  console.log('[webview-receive-content] ok');
  process.exit(0);
}

if (!source.includes(MARKER)) {
  const ctorAnchor = `    public RNCWebView(ThemedReactContext reactContext) {
        super(reactContext);
        mMessagingJSModule = ((ThemedReactContext) this.getContext()).getReactApplicationContext().getJSModule(RNCWebViewMessagingModule.class);
        progressChangedFilter = new ProgressChangedFilter();
    }`;

  const methodAnchor =
    '    public void setBasicAuthCredential(RNCBasicAuthCredential credential) {';

  if (!source.includes(ctorAnchor) || !source.includes(methodAnchor)) {
    console.error('[webview-receive-content] FAIL: source changed (drift), patch not applied');
    process.exit(1);
  }

  const method = `    // ${MARKER} gboard image paste (commitContent) → editor.
    // tanpa listener ini webview ga declare image/*, gboard nolak paste
    // sebelum nyampe JS. item image di-consume di sini (bytes → base64 →
    // JS), sisanya balik ke webview biar paste teks biasa ga keganggu.
    private void setupPaperiteReceiveContent() {
        androidx.core.view.ViewCompat.setOnReceiveContentListener(
            this,
            new String[]{"image/*"},
            (view, payload) -> {
                android.content.ClipData clip = payload.getClip();
                java.util.ArrayList<android.net.Uri> imageUris = new java.util.ArrayList<>();
                java.util.ArrayList<android.content.ClipData.Item> remaining = new java.util.ArrayList<>();
                for (int i = 0; i < clip.getItemCount(); i++) {
                    android.content.ClipData.Item item = clip.getItemAt(i);
                    if (item.getUri() != null) {
                        imageUris.add(item.getUri());
                    } else {
                        remaining.add(item);
                    }
                }
                if (imageUris.isEmpty()) {
                    return payload;
                }
                // baca file di thread background — gambar gede di UI thread = ANR.
                final android.content.Context appContext = view.getContext().getApplicationContext();
                new Thread(() -> {
                    java.util.ArrayList<String> dataUrls = new java.util.ArrayList<>();
                    for (android.net.Uri uri : imageUris) {
                        try (java.io.InputStream in = appContext.getContentResolver().openInputStream(uri)) {
                            if (in == null) continue;
                            java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
                            byte[] tmp = new byte[8192];
                            int n;
                            while ((n = in.read(tmp)) != -1) buf.write(tmp, 0, n);
                            String mime = appContext.getContentResolver().getType(uri);
                            if (mime == null || !mime.startsWith("image/")) mime = "image/png";
                            String base64 = android.util.Base64.encodeToString(buf.toByteArray(), android.util.Base64.NO_WRAP);
                            dataUrls.add("data:" + mime + ";base64," + base64);
                        } catch (Exception e) {
                            // satu gambar gagal = skip, sisanya tetep masuk.
                        }
                    }
                    if (dataUrls.isEmpty()) return;
                    StringBuilder js = new StringBuilder("window.__paperiteReceiveImages&&window.__paperiteReceiveImages([");
                    for (int i = 0; i < dataUrls.size(); i++) {
                        if (i > 0) js.append(',');
                        js.append(org.json.JSONObject.quote(dataUrls.get(i)));
                    }
                    js.append("])");
                    final String script = js.toString();
                    view.post(() -> ((android.webkit.WebView) view).evaluateJavascript(script, null));
                }).start();
                if (remaining.isEmpty()) {
                    return null;
                }
                android.content.ClipData newClip = new android.content.ClipData(clip.getDescription(), remaining.get(0));
                for (int i = 1; i < remaining.size(); i++) {
                    newClip.addItem(remaining.get(i));
                }
                return new androidx.core.view.ContentInfoCompat.Builder(payload).setClip(newClip).build();
            });
    }

`;

  source = source.replace(
    ctorAnchor,
    ctorAnchor.replace('    }', '        setupPaperiteReceiveContent();\n    }')
  );
  source = source.replace(methodAnchor, method + methodAnchor);

  if (!source.includes(MARKER) || !source.includes('setupPaperiteReceiveContent();')) {
    console.error('[webview-receive-content] FAIL: v1 replace missed, file untouched');
    process.exit(1);
  }
}

// v2: anchor = baris pertama method v1 (pasti ada kalau v1 kepasang).
const v2Anchor = `    // ${MARKER} gboard image paste (commitContent) → editor.`;

if (!source.includes(v2Anchor)) {
  console.error('[webview-receive-content] FAIL: v1 marker missing, cannot apply v2');
  process.exit(1);
}

const v2Method = `    // ${MARKER_V2} iklanin image/* ke IME + arahin commitContent ke
    // listener v1. gboard mutusin boleh paste dari EditorInfo.contentMimeTypes
    // (dibikin di sini), bukan dari listener — tanpa override ini toast
    // "ne permet pas de coller" muncul duluan sebelum listener kepanggil.
    @Override
    public android.view.inputmethod.InputConnection onCreateInputConnection(android.view.inputmethod.EditorInfo outAttrs) {
        android.view.inputmethod.InputConnection ic = super.onCreateInputConnection(outAttrs);
        if (ic == null) {
            return null;
        }
        androidx.core.view.inputmethod.EditorInfoCompat.setContentMimeTypes(outAttrs, new String[]{"image/*"});
        return androidx.core.view.inputmethod.InputConnectionCompat.createWrapper(this, ic, outAttrs);
    }

`;

source = source.replace(v2Anchor, v2Method + v2Anchor);

if (!source.includes(MARKER_V2)) {
  console.error('[webview-receive-content] FAIL: v2 replace missed, file untouched');
  process.exit(1);
}

fs.writeFileSync(file, source);
console.log('[webview-receive-content] patched');
