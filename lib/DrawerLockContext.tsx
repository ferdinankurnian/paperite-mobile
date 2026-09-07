import * as React from 'react';

// Kunci drawer swipe selama overlay top-level (mis. dropdown menu) kebuka.
// Overlay transparan nggak bisa nge-block drawer gesture yang jalan di level
// gesture-handler, jadi swipe-nya yang dimatiin dari sisi drawer.
type DrawerLockContextValue = {
  locked: boolean;
  setLocked: (locked: boolean) => void;
};

const DrawerLockContext = React.createContext<DrawerLockContextValue | null>(null);

export function DrawerLockProvider({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = React.useState(false);

  const value = React.useMemo(() => ({ locked, setLocked }), [locked]);

  return <DrawerLockContext.Provider value={value}>{children}</DrawerLockContext.Provider>;
}

export function useDrawerLock() {
  const ctx = React.useContext(DrawerLockContext);
  if (!ctx) {
    throw new Error('useDrawerLock must be used within DrawerLockProvider');
  }
  return ctx;
}
