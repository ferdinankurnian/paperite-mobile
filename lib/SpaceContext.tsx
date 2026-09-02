import * as React from 'react';

import { type SpaceId, SPACES, getSpaceById } from '@/lib/paperite-data';

type SpaceContextValue = {
  activeSpaceId: SpaceId;
  setActiveSpaceId: (id: SpaceId) => void;
  activeSpaceName: string;
};

const SpaceContext = React.createContext<SpaceContextValue | null>(null);

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const [activeSpaceId, setActiveSpaceId] = React.useState<SpaceId>('music');

  const activeSpaceName = getSpaceById(activeSpaceId)?.name ?? SPACES[0].name;

  const value = React.useMemo(
    () => ({ activeSpaceId, setActiveSpaceId, activeSpaceName }),
    [activeSpaceId, activeSpaceName]
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
