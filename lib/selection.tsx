import * as React from 'react';

type SelectionContextValue = {
  /** lagi di select mode atau nggak */
  selecting: boolean;
  /** masuk select mode (opsional langsung select 1 note) */
  enterSelection: (id?: string) => void;
  /** keluar select mode + clear */
  exitSelection: () => void;
  selectedIds: string[];
  selectedCount: number;
  isSelected: (id: string) => boolean;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  /** daftar id note yang lagi keliatan — didaftarin list screen biar header bisa select-all */
  allIds: string[];
  setAllIds: (ids: string[]) => void;
  toggleSelectAll: () => void;
};

const SelectionContext = React.createContext<SelectionContextValue>({
  selecting: false,
  enterSelection: () => undefined,
  exitSelection: () => undefined,
  selectedIds: [],
  selectedCount: 0,
  isSelected: () => false,
  toggleSelect: () => undefined,
  selectAll: () => undefined,
  clearSelection: () => undefined,
  allIds: [],
  setAllIds: () => undefined,
  toggleSelectAll: () => undefined,
});

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selecting, setSelecting] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [allIds, setAllIds] = React.useState<string[]>([]);

  const enterSelection = React.useCallback((id?: string) => {
    setSelecting(true);
    if (id) setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const exitSelection = React.useCallback(() => {
    setSelecting(false);
    setSelectedIds([]);
  }, []);

  const toggleSelect = React.useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }, []);

  const selectAll = React.useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedIds([]);
  }, []);

  const toggleSelectAll = React.useCallback(() => {
    setSelectedIds((prev) => (prev.length >= allIds.length ? [] : [...allIds]));
  }, [allIds]);

  const isSelected = React.useCallback((id: string) => selectedIds.includes(id), [selectedIds]);

  const value = React.useMemo(
    () => ({
      selecting,
      enterSelection,
      exitSelection,
      selectedIds,
      selectedCount: selectedIds.length,
      isSelected,
      toggleSelect,
      selectAll,
      clearSelection,
      allIds,
      setAllIds,
      toggleSelectAll,
    }),
    [selecting, enterSelection, exitSelection, selectedIds, isSelected, toggleSelect, selectAll, clearSelection, allIds, toggleSelectAll]
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  return React.useContext(SelectionContext);
}
