import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

import { type Space, type SpaceId } from '@/lib/paperite-data';
import { SPACE_COLORS } from '@/lib/space-options';
import { addSpaceFolder, ensureStorageReady, listSpaces } from '@/lib/storage';
import { INBOX_ID } from '@/lib/storage/files';

const ACTIVE_SPACE_KEY = 'paperite:active-space';

type SpaceContextValue = {
  ready: boolean;
  activeSpaceId: SpaceId;
  setActiveSpaceId: (id: SpaceId) => void;
  activeSpaceName: string;
  activeSpace: Space | undefined;
  spaces: Space[];
  addSpace: (name: string, icon?: string, color?: string) => Promise<Space>;
  refreshSpaces: () => Promise<Space[]>;
};

const SpaceContext = React.createContext<SpaceContextValue | null>(null);

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [activeSpaceId, setActiveSpaceIdState] = React.useState<SpaceId>(INBOX_ID);
  const [spaces, setSpaces] = React.useState<Space[]>([]);

  const refreshSpaces = React.useCallback(async () => {
    await ensureStorageReady();
    const loaded = await listSpaces();
    setSpaces(loaded);
    return loaded;
  }, []);

  React.useEffect(() => {
    (async () => {
      const loaded = await refreshSpaces();
      const saved = await AsyncStorage.getItem(ACTIVE_SPACE_KEY).catch(() => null);
      // remap id lama lowercase (pre-folder) ke kapital 1:1 desktop
      const remapped = saved === 'inbox' ? INBOX_ID : saved === 'trash' ? 'Trash' : saved;
      if (remapped && loaded.some((s) => s.id === remapped)) {
        setActiveSpaceIdState(remapped);
      } else {
        setActiveSpaceIdState(loaded[0]?.id ?? INBOX_ID);
      }
      setReady(true);
    })();
  }, [refreshSpaces]);

  const setActiveSpaceId = React.useCallback((id: SpaceId) => {
    setActiveSpaceIdState(id);
    AsyncStorage.setItem(ACTIVE_SPACE_KEY, id).catch(() => undefined);
  }, []);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId);
  const activeSpaceName = activeSpace?.name ?? '';

  const addSpace = React.useCallback(
    async (name: string, icon = 'folder', color: string = SPACE_COLORS[0]) => {
      await ensureStorageReady();
      const space = await addSpaceFolder(name, icon, color);
      setSpaces((prev) => [...prev, space]);
      setActiveSpaceId(space.id);
      return space;
    },
    [setActiveSpaceId]
  );

  const value = React.useMemo(
    () => ({
      ready,
      activeSpaceId,
      setActiveSpaceId,
      activeSpaceName,
      activeSpace,
      spaces,
      addSpace,
      refreshSpaces,
    }),
    [
      ready,
      activeSpaceId,
      setActiveSpaceId,
      activeSpaceName,
      activeSpace,
      spaces,
      addSpace,
      refreshSpaces,
    ]
  );

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}

export function useSpace() {
  const ctx = React.useContext(SpaceContext);
  if (!ctx) {
    throw new Error('useSpace must be used within SpaceProvider');
  }
  return ctx;
}
