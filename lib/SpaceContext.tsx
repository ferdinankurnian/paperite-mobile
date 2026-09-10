import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

import { type Space, type SpaceId } from '@/lib/paperite-data';
import { SPACE_COLORS } from '@/lib/space-options';
import { addSpaceFolder, ensureStorageReady, listSpaces } from '@/lib/storage';

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
  const [activeSpaceId, setActiveSpaceIdState] = React.useState<SpaceId>('inbox');
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
      if (saved && loaded.some((s) => s.id === saved)) {
        setActiveSpaceIdState(saved);
      } else {
        setActiveSpaceIdState(loaded[0]?.id ?? 'inbox');
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
    [ready, activeSpaceId, setActiveSpaceId, activeSpaceName, activeSpace, spaces, addSpace, refreshSpaces]
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
