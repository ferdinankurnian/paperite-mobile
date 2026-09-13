// .paperite/state.json — 1:1 key sama desktop (server/lib/workspace.js statePath)
// biar icon/color/expand bikinan mobile kebaca desktop dan sebaliknya.
// desktop nyimpen PaperiteAppState penuh; mobile cuma baca-tulis key yang
// dipake, key lain dipertahanin apa adanya (jangan ditimpa buta).

import { readJsonFile, stateFile, writeJsonFile } from './files';

export type AppStatePatch = {
  spaceIcons?: Record<string, string>;
  spaceColors?: Record<string, string>;
  spaceOrder?: string[];
  expandedFolders?: string[];
  spaceFolderFirst?: Record<string, boolean>;
};

type RawState = Record<string, unknown>;

async function readRaw(): Promise<RawState> {
  const parsed = await readJsonFile<RawState>(stateFile());
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  return {};
}

function pickRecord(raw: RawState, key: string): Record<string, string> {
  const v = raw[key];
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === 'string') out[k] = val;
    }
    return out;
  }
  return {};
}

function pickStrings(raw: RawState, key: string): string[] {
  const v = raw[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export async function readAppState(): Promise<{
  spaceIcons: Record<string, string>;
  spaceColors: Record<string, string>;
  spaceOrder: string[];
  expandedFolders: string[];
}> {
  const raw = await readRaw();
  return {
    spaceIcons: pickRecord(raw, 'spaceIcons'),
    spaceColors: pickRecord(raw, 'spaceColors'),
    spaceOrder: pickStrings(raw, 'spaceOrder'),
    expandedFolders: pickStrings(raw, 'expandedFolders'),
  };
}

/** merge patch ke state.json tanpa ngilangin key desktop lain. */
export async function writeAppState(patch: AppStatePatch): Promise<void> {
  const raw = await readRaw();
  const next: RawState = { ...raw };
  if (patch.spaceIcons) next.spaceIcons = { ...pickRecord(raw, 'spaceIcons'), ...patch.spaceIcons };
  if (patch.spaceColors)
    next.spaceColors = { ...pickRecord(raw, 'spaceColors'), ...patch.spaceColors };
  if (patch.spaceOrder) next.spaceOrder = patch.spaceOrder;
  if (patch.expandedFolders) next.expandedFolders = patch.expandedFolders;
  if (patch.spaceFolderFirst) {
    const prev = raw.spaceFolderFirst;
    next.spaceFolderFirst = {
      ...(prev && typeof prev === 'object' && !Array.isArray(prev)
        ? (prev as Record<string, unknown>)
        : {}),
      ...patch.spaceFolderFirst,
    };
  }
  writeJsonFile(stateFile(), next);
}
