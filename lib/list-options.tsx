// opsi tampilan note list per space (parity dropdown desktop di
// paperite/src/components/app-sidebar.tsx — minus yang belum ada di mobile:
// custom sort butuh drag-reorder, grid view belum ada, edit/delete space
// fitur terpisah). persist per space di AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

import { useSpace } from '@/lib/SpaceContext';

/** 1:1 SidebarSortOrder desktop minus "custom" (mobile belum ada reorder). */
export type ListSortOrder = 'newest' | 'oldest' | 'a-z' | 'z-a';

export const LIST_SORT_ORDERS: ListSortOrder[] = ['newest', 'oldest', 'a-z', 'z-a'];

export const LIST_SORT_LABELS: Record<ListSortOrder, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  'a-z': 'A to Z',
  'z-a': 'Z to A',
};

const SORT_KEY = 'paperite:list-sort-v1';
const FOLDERS_FIRST_KEY = 'paperite:list-folders-first-v1';
const SHOW_PREVIEW_KEY = 'paperite:list-show-preview-v1';

export const DEFAULT_SORT: ListSortOrder = 'newest';
// mobile selama ini selalu folder dulu — default true biar ga kaget.
export const DEFAULT_FOLDERS_FIRST = true;
export const DEFAULT_SHOW_PREVIEW = true;

function isSortOrder(v: unknown): v is ListSortOrder {
  return v === 'newest' || v === 'oldest' || v === 'a-z' || v === 'z-a';
}

async function loadMap(key: string): Promise<Record<string, unknown>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // corrupt / belum ada — mulai kosong aja
  }
  return {};
}

type ListOptionsContextValue = {
  sortOrder: ListSortOrder;
  setSortOrder: (order: ListSortOrder) => void;
  foldersFirst: boolean;
  setFoldersFirst: (v: boolean) => void;
  showPreview: boolean;
  setShowPreview: (v: boolean) => void;
  /** space aktif lagi ada folder atau engga — dilaporin list screen,
   *  header pake buat nyembunyiin toggle "folders first" yang ga relevan. */
  hasFolders: boolean;
  setHasFolders: (v: boolean) => void;
};

const ListOptionsContext = React.createContext<ListOptionsContextValue>({
  sortOrder: DEFAULT_SORT,
  setSortOrder: () => undefined,
  foldersFirst: DEFAULT_FOLDERS_FIRST,
  setFoldersFirst: () => undefined,
  showPreview: DEFAULT_SHOW_PREVIEW,
  setShowPreview: () => undefined,
  hasFolders: false,
  setHasFolders: () => undefined,
});

export function ListOptionsProvider({ children }: { children: React.ReactNode }) {
  const { activeSpaceId } = useSpace();
  const [sortMap, setSortMap] = React.useState<Record<string, ListSortOrder>>({});
  const [foldersFirstMap, setFoldersFirstMap] = React.useState<Record<string, boolean>>({});
  const [showPreviewMap, setShowPreviewMap] = React.useState<Record<string, boolean>>({});
  const [hasFolders, setHasFoldersState] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const [sortRaw, foldersRaw, previewRaw] = await Promise.all([
        loadMap(SORT_KEY),
        loadMap(FOLDERS_FIRST_KEY),
        loadMap(SHOW_PREVIEW_KEY),
      ]);
      const sorts: Record<string, ListSortOrder> = {};
      for (const [k, v] of Object.entries(sortRaw)) {
        if (isSortOrder(v)) sorts[k] = v;
      }
      const folders: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(foldersRaw)) {
        if (typeof v === 'boolean') folders[k] = v;
      }
      const previews: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(previewRaw)) {
        if (typeof v === 'boolean') previews[k] = v;
      }
      setSortMap(sorts);
      setFoldersFirstMap(folders);
      setShowPreviewMap(previews);
      setLoaded(true);
    })();
  }, []);

  const persist = React.useCallback((key: string, map: Record<string, unknown>) => {
    AsyncStorage.setItem(key, JSON.stringify(map)).catch(() => undefined);
  }, []);

  const setSortOrder = React.useCallback(
    (order: ListSortOrder) => {
      setSortMap((prev) => {
        const next = { ...prev, [activeSpaceId]: order };
        if (loaded) persist(SORT_KEY, next);
        return next;
      });
    },
    [activeSpaceId, loaded, persist]
  );

  const setFoldersFirst = React.useCallback(
    (v: boolean) => {
      setFoldersFirstMap((prev) => {
        const next = { ...prev, [activeSpaceId]: v };
        if (loaded) persist(FOLDERS_FIRST_KEY, next);
        return next;
      });
    },
    [activeSpaceId, loaded, persist]
  );

  const setShowPreview = React.useCallback(
    (v: boolean) => {
      setShowPreviewMap((prev) => {
        const next = { ...prev, [activeSpaceId]: v };
        if (loaded) persist(SHOW_PREVIEW_KEY, next);
        return next;
      });
    },
    [activeSpaceId, loaded, persist]
  );

  // cuma cerminin space aktif (yang mount list cuma space aktif) — ga perlu
  // per-space map. guard biar ga re-render tiap reload kalo nilainya sama.
  const setHasFolders = React.useCallback((v: boolean) => {
    setHasFoldersState((prev) => (prev === v ? prev : v));
  }, []);

  const value = React.useMemo<ListOptionsContextValue>(
    () => ({
      sortOrder: sortMap[activeSpaceId] ?? DEFAULT_SORT,
      setSortOrder,
      foldersFirst: foldersFirstMap[activeSpaceId] ?? DEFAULT_FOLDERS_FIRST,
      setFoldersFirst,
      showPreview: showPreviewMap[activeSpaceId] ?? DEFAULT_SHOW_PREVIEW,
      setShowPreview,
      hasFolders,
      setHasFolders,
    }),
    [
      sortMap,
      foldersFirstMap,
      showPreviewMap,
      activeSpaceId,
      setSortOrder,
      setFoldersFirst,
      setShowPreview,
      hasFolders,
      setHasFolders,
    ]
  );

  return <ListOptionsContext.Provider value={value}>{children}</ListOptionsContext.Provider>;
}

export function useListOptions() {
  return React.useContext(ListOptionsContext);
}
