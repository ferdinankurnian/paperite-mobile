// jembatan list screen ↔ AppHeader (header dipasang di layout, di luar
// screen — prop drilling ga nyampe). screen yang provide, header yang consume.

import * as React from 'react';

export type MoveTarget = {
  /** path item yang dipindah (note atau folder) */
  path: string;
  title: string;
};

type ListActionsValue = {
  /** bulk delete by note id (header selection mode) */
  bulkDelete: (ids: string[]) => Promise<void>;
  /** bulk/single move — buka MoveSheet */
  requestMove: (targets: MoveTarget[]) => void;
  /** buka FolderNameSheet mode create di parent ini */
  requestCreateFolder: (parentPath: string) => void;
  /** buka FolderNameSheet mode rename */
  requestRename: (path: string, currentTitle: string) => void;
};

const noopAsync = async () => undefined;
const noop = () => undefined;

const ListActionsContext = React.createContext<ListActionsValue>({
  bulkDelete: noopAsync,
  requestMove: noop,
  requestCreateFolder: noop,
  requestRename: noop,
});

export function ListActionsProvider({
  value,
  children,
}: {
  value: ListActionsValue;
  children: React.ReactNode;
}) {
  return <ListActionsContext.Provider value={value}>{children}</ListActionsContext.Provider>;
}

export function useListActions() {
  return React.useContext(ListActionsContext);
}
