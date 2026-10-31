/**
 * Generic double-tap-to-dash detector. Was a private class inside
 * BattleScreen.tsx (fighting-mode only, -1/1 directions); pulled out here
 * so WorldScreen's dash (added in the "arrume os controles" pass, see
 * docs/AUDIT.md) uses the exact same timing/logic instead of a re-typed
 * copy that could quietly drift from it. Generic over the key type so
 * battle can key by -1|1 and the world map can key by up/down/left/right.
 */
export const DOUBLE_TAP_MS = 300;

export class TapDashDetector<TKey> {
  private lastKey: TKey | null = null;
  private lastTime = 0;

  /** Call on every tap; returns true exactly when this tap completes a
   * double-tap (caller decides what that triggers - a dash, generally). */
  tap(key: TKey): boolean {
    const now = Date.now();
    if (this.lastKey === key && now - this.lastTime < DOUBLE_TAP_MS) {
      this.lastKey = null;
      this.lastTime = 0;
      return true;
    }
    this.lastKey = key;
    this.lastTime = now;
    return false;
  }
}
