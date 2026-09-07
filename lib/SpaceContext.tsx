import * as React from 'react';

import { type Space, type SpaceId, SPACES } from '@/lib/paperite-data';
import { SPACE_COLORS } from '@/lib/space-options';

type SpaceContextValue = {
  activeSpaceId: SpaceId;
  setActiveSpaceId: (id: SpaceId) => void;
  activeSpaceName: string;
  activeSpace: Space | undefined;
  spaces: Space[];
  addSpace: (name: string, icon?: string, color?: string) => Space;
};

const SpaceContext = React.createContext<SpaceContextValue | null>(null);

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const [activeSpaceId, setActiveSpaceId] = React.useState<SpaceId>('music');
  const [spaces, setSpaces] = React.useState<Space[]>(SPACES);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId);
  const activeSpaceName = activeSpace?.name ?? spaces[0]?.name ?? '';

  const addSpace = React.useCallback((name: string, icon = 'folder', color: string = SPACE_COLORS[0]) => {
    const trimmed = name.trim();
    const id = `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const space: Space = { id, name: trimmed, icon, kind: 'space', color };
    setSpaces((prev) => [...prev, space]);
    setActiveSpaceId(id);
    return space;
  }, []);

  const value = React.useMemo(
    () => ({ activeSpaceId, setActiveSpaceId, activeSpaceName, activeSpace, spaces, addSpace }),
    [activeSpaceId, activeSpaceName, activeSpace, spaces, addSpace]
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
