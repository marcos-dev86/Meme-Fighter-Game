import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * User-editable placement of EVERY on-screen control ("EDITAR CONTROLES"
 * in the options menu). Each button (the 4 directions, jump, flash, shield,
 * strong, super, aura, item and the pause button) has its own:
 *   - dx / dy   offset in px from its default spot (+ = right / down)
 *   - scale     size multiplier (MIN_SCALE .. MAX_SCALE)
 *   - color     custom colour (hex) or null for the built-in colour
 *   - hidden    true = the player removed this button
 * Shared by story mode, interiors and the fights, saved on the device
 * (AsyncStorage) so it survives restarts.
 */
export type ButtonId =
  | 'up' | 'down' | 'left' | 'right'
  | 'jump' | 'flash' | 'shield' | 'strong' | 'super' | 'aura' | 'item'
  | 'pause';

export const BUTTON_IDS: ButtonId[] = ['up', 'down', 'left', 'right', 'jump', 'flash', 'shield', 'strong', 'super', 'aura', 'item', 'pause'];
export const DPAD_IDS: ButtonId[] = ['up', 'down', 'left', 'right'];
export const ACTION_IDS: ButtonId[] = ['jump', 'flash', 'shield', 'strong', 'super', 'aura', 'item'];

export interface ButtonLayout {
  scale: number;
  dx: number;
  dy: number;
  color: string | null;
  hidden: boolean;
}
export type ControlsLayout = Record<ButtonId, ButtonLayout>;

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2.2;
const KEY = 'meme_fighter_controls_v2';
const OLD_KEY = 'meme_fighter_controls_v1';

/** Palette offered by the editor. */
export const COLOR_CHOICES = ['#FFD700', '#FF7A00', '#E23C14', '#FF5FA2', '#B565E8', '#00AEEF', '#26C6DA', '#8BC34A', '#FFFFFF'];

function freshButton(): ButtonLayout {
  return { scale: 1, dx: 0, dy: 0, color: null, hidden: false };
}
export function defaultControlsLayout(): ControlsLayout {
  const out = {} as ControlsLayout;
  BUTTON_IDS.forEach((id) => (out[id] = freshButton()));
  return out;
}

let layout: ControlsLayout = defaultControlsLayout();
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function saneButton(c: Partial<ButtonLayout> | undefined): ButtonLayout {
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  return {
    scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, num(c?.scale, 1))),
    dx: num(c?.dx, 0),
    dy: num(c?.dy, 0),
    color: typeof c?.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : null,
    hidden: c?.hidden === true,
  };
}

async function loadOnce() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<Record<ButtonId, Partial<ButtonLayout>>>;
      const next = defaultControlsLayout();
      BUTTON_IDS.forEach((id) => (next[id] = saneButton(data[id])));
      layout = next;
      notify();
      return;
    }
    // One-time migration from the old two-cluster layout (v1).
    const old = await AsyncStorage.getItem(OLD_KEY);
    if (old) {
      const data = JSON.parse(old) as { dpad?: Partial<ButtonLayout>; actions?: Partial<ButtonLayout> };
      const next = defaultControlsLayout();
      DPAD_IDS.forEach((id) => (next[id] = saneButton({ scale: data.dpad?.scale, dx: data.dpad?.dx, dy: data.dpad?.dy })));
      ACTION_IDS.forEach((id) => (next[id] = saneButton({ scale: data.actions?.scale, dx: data.actions?.dx, dy: data.actions?.dy })));
      layout = next;
      notify();
    }
  } catch {
    // unreadable -> keep defaults
  }
}

export function getControlsLayout(): ControlsLayout {
  return layout;
}

/** Updates one button in memory (live preview while dragging). */
export function setButtonLayout(id: ButtonId, patch: Partial<ButtonLayout>) {
  layout = { ...layout, [id]: saneButton({ ...layout[id], ...patch }) };
  notify();
}

export async function persistControlsLayout() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(layout));
  } catch {
    // best-effort
  }
}

export async function resetControlsLayout() {
  layout = defaultControlsLayout();
  notify();
  await persistControlsLayout();
}

export async function resetButtonLayout(id: ButtonId) {
  layout = { ...layout, [id]: freshButton() };
  notify();
  await persistControlsLayout();
}

export function useControlsLayout(): ControlsLayout {
  'use no memo'; // module-level store: the React Compiler must not cache what we read from it
  const [, setTick] = useState(0);
  useEffect(() => {
    void loadOnce();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return layout;
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

export const BASE_SIZE = 58; // diameter of one small button at scale 1
export const JUMP_SCALE = 1.36;
export const PAUSE_BASE = 56;
const DPAD_STEP = 0.86;
const DPAD_LEFT = 24;
const DPAD_BOTTOM = 28;
const ACTION_RIGHT = 16;
const ACTION_BOTTOM = 20;

/** Each action button's CENTER relative to the jump button's centre, in
 * units of BASE_SIZE (measured from the user's own flower mockup, then
 * spread ~8% so no two circles ever touch, even at larger sizes). */
const FLOWER = {
  flash: { dx: -0.06, dy: -1.55 },
  super: { dx: 1.05, dy: -0.92 },
  shield: { dx: -1.1, dy: -0.86 },
  strong: { dx: -1.46, dy: 0.3 },
  aura: { dx: 0.74, dy: 1.27 },
  item: { dx: -0.6, dy: 1.28 },
} as const;

interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ButtonRect {
  /** centre, px, in screen coordinates */
  cx: number;
  cy: number;
  /** diameter (pause: side) */
  size: number;
  layout: ButtonLayout;
}

/** Default centre of every button (scale 1, no offset). */
export function getDefaultCenters(W: number, H: number, insets: Insets): Record<ButtonId, { cx: number; cy: number }> {
  const s = BASE_SIZE;
  const step = s * DPAD_STEP;
  const span = step * 2 + s;
  const dLeft = DPAD_LEFT + insets.left;
  const dTop = H - (DPAD_BOTTOM + insets.bottom) - span;
  const c = (x: number, y: number) => ({ cx: dLeft + x + s / 2, cy: dTop + y + s / 2 });

  // action cluster: bounding box -> jump centre
  const bigR = (s * JUMP_SCALE) / 2;
  const r = s / 2;
  const xs = Object.values(FLOWER).map((o) => o.dx * s);
  const ys = Object.values(FLOWER).map((o) => o.dy * s);
  const minX = Math.min(-bigR, ...xs.map((x) => x - r));
  const maxX = Math.max(bigR, ...xs.map((x) => x + r));
  const minY = Math.min(-bigR, ...ys.map((y) => y - r));
  const maxY = Math.max(bigR, ...ys.map((y) => y + r));
  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const boxLeft = W - (ACTION_RIGHT + insets.right) - boxW;
  const boxTop = H - (ACTION_BOTTOM + insets.bottom) - boxH;
  const jx = boxLeft - minX;
  const jy = boxTop - minY;
  const a = (k: keyof typeof FLOWER) => ({ cx: jx + FLOWER[k].dx * s, cy: jy + FLOWER[k].dy * s });

  return {
    up: c(step, 0),
    left: c(0, step),
    right: c(step * 2, step),
    down: c(step, step * 2),
    jump: { cx: jx, cy: jy },
    flash: a('flash'),
    shield: a('shield'),
    strong: a('strong'),
    super: a('super'),
    aura: a('aura'),
    item: a('item'),
    pause: { cx: W / 2, cy: insets.top + 58 },
  };
}

function baseSizeOf(id: ButtonId) {
  return id === 'jump' ? BASE_SIZE * JUMP_SCALE : id === 'pause' ? PAUSE_BASE : BASE_SIZE;
}

/** Final rect of every button for the saved layout, clamped on screen. */
export function computeButtonRects(l: ControlsLayout, W: number, H: number, insets: Insets): Record<ButtonId, ButtonRect> {
  const defs = getDefaultCenters(W, H, insets);
  const out = {} as Record<ButtonId, ButtonRect>;
  BUTTON_IDS.forEach((id) => {
    const b = l[id];
    const size = baseSizeOf(id) * b.scale;
    const half = size / 2;
    out[id] = {
      cx: Math.min(W - half, Math.max(half, defs[id].cx + b.dx)),
      cy: Math.min(H - half, Math.max(half, defs[id].cy + b.dy)),
      size,
      layout: b,
    };
  });
  return out;
}

/** Live rects for the current window / safe area / saved layout. */
export function useButtonRects(): Record<ButtonId, ButtonRect> {
  const l = useControlsLayout();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return computeButtonRects(l, width, height, insets);
}

/** Where the ITEM popup should open (next to the item button, on the side with room). */
export function useItemMenuAnchor(): { left?: number; right?: number; bottom: number } {
  const rects = useButtonRects();
  const { width, height } = useWindowDimensions();
  const it = rects.item;
  const bottom = Math.min(height - 170, Math.max(8, height - (it.cy + it.size / 2)));
  if (it.cx > width / 2) return { right: width - (it.cx - it.size / 2) + 10, bottom };
  return { left: it.cx + it.size / 2 + 10, bottom };
}

/** '#RRGGBB' -> 'rgba(r,g,b,a)' */
export function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
