// expand/collapse folder per path, persist ke .paperite/state.json
// (key expandedFolders — 1:1 desktop, jadi expand mobile kebaca desktop).

import * as React from 'react';

import { ensureStorageReady, readAppState, writeAppState } from '@/lib/storage';

export function useExpandedFolders() {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        await ensureStorageReady();
        const state = await readAppState();
        setExpanded(new Set(state.expandedFolders));
      } catch {
        // abaikan, mulai collapsed semua
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = React.useCallback((next: Set<string>) => {
    setExpanded(next);
    writeAppState({ expandedFolders: [...next] }).catch(() => undefined);
  }, []);

  const toggle = React.useCallback(
    (path: string) => {
      const next = new Set(expanded);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      persist(next);
    },
    [expanded, persist]
  );

  const expand = React.useCallback(
    (path: string) => {
      if (expanded.has(path)) return;
      const next = new Set(expanded);
      next.add(path);
      persist(next);
    },
    [expanded, persist]
  );

  return { expanded, ready, toggle, expand };
}
