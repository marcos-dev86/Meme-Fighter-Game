/**
 * Save extensions: modules that have their own persistent state (time of
 * day, tower ranking, skills, cosmetics, tips seen, ...) register here and
 * their data rides along in SaveData.ext[key]. Older saves simply have no
 * entry, so each module's restore() must accept `undefined` and fall back to
 * its defaults.
 */
export interface SaveExt {
  key: string;
  snapshot: () => unknown;
  restore: (data: unknown) => void;
  reset: () => void;
}

const exts: SaveExt[] = [];

export function registerSaveExt(e: SaveExt) {
  if (!exts.some((x) => x.key === e.key)) exts.push(e);
}

export function snapshotExts(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const e of exts) out[e.key] = e.snapshot();
  return out;
}

export function restoreExts(data?: Record<string, unknown>) {
  for (const e of exts) {
    try {
      e.restore(data?.[e.key]);
    } catch {
      e.reset();
    }
  }
}

export function resetExts() {
  for (const e of exts) e.reset();
}
