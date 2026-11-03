import { useEffect, useState } from 'react';
import { ITEMS } from '@/game/items/itemDefs';
import { costForNextLevel, MAX_LEVEL, type UpgradeStat } from '@/game/items/upgrades';
import { MAX_PLAYER_LEVEL, pointsForReaching, xpToNext } from '@/game/items/levels';
import { BAGS, DEFAULT_BAG, MAX_STACK, bagEffectsOf } from '@/game/items/bags';
import { getBagEffects, setBagEffects } from '@/game/items/bagRuntime';
import { playSfx } from '@/game/audio/audioManager';
import { haptic } from '@/game/audio/haptics';

/**
 * Coins/inventory need to survive navigating between screens (world ->
 * shop -> inventory -> battle -> back), but each screen is a separate
 * mounted/unmounted component under Expo Router, so component state
 * alone won't do. This is a plain module-level singleton instead of a
 * state library: ES modules are already singletons, and a tiny pub-sub
 * is all a handful of numbers/flags need. Persisted to disk via
 * saveState.ts (AsyncStorage) - this module itself still just holds the
 * in-memory copy; getPlayerStateSnapshot()/restorePlayerState() below are
 * the two ends saveState.ts reads/writes through.
 */

/** Two equip slots (the "item mechanic" for story mode and the retro
 * fight): the player puts up to 2 inventory items into slots, then taps
 * the ITEM button in-game to use one instantly. Slots hold an item id or
 * null. Equipping doesn't remove the item from the inventory; using it
 * (consumeEquippedItem) spends one, and clears the slot when the stack
 * runs out. */
export type EquipSlots = [string | null, string | null];

interface PlayerState {
  coins: number;
  inventory: Record<string, number>; // itemId -> quantity
  collected: Set<string>; // pickup/chest ids already claimed, so they don't respawn
  equipped: EquipSlots;
  /** Permanent stat levels (Pontos de Poder) (see upgrades.ts) - 1 to MAX_LEVEL
   * each, start at 1. These never reset. */
  upgrades: Record<UpgradeStat, number>;
  /** XP system (see levels.ts): XP inside the current level, the level, and unspent status points. */
  xp: number;
  level: number;
  statPoints: number;
  /** Bags owned and the one in use (see bags.ts). */
  bags: string[];
  bagId: string;
}

function freshUpgrades(): Record<UpgradeStat, number> {
  return { health: 1, aura: 1, speed: 1, force: 1 };
}

const state: PlayerState = {
  coins: 40,
  inventory: {},
  collected: new Set(),
  equipped: [null, null],
  upgrades: freshUpgrades(),
  xp: 0,
  level: 1,
  statPoints: 0,
  bags: [DEFAULT_BAG],
  bagId: DEFAULT_BAG,
};
/** Latest level reached that the world hasn't announced yet (toast "NÍVEL N!"). */
let levelNotice: number | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((fn) => fn());
}

export function getCoins(): number {
  return state.coins;
}

/** Adds coins; `bonus` (default) applies the bag's coin bonus - pass false for casino winnings and refunds. */
export function addCoins(amount: number, bonus = true) {
  state.coins += bonus ? Math.round(amount * getBagEffects().coinMult) : amount;
  notify();
}

export function spendCoins(amount: number): boolean {
  if (state.coins < amount) return false;
  state.coins -= amount;
  notify();
  return true;
}

export function getInventory(): Record<string, number> {
  return state.inventory;
}

/** For the save system (saveState.ts) - a plain-JSON-serializable copy
 * (the real state.collected is a Set, which JSON.stringify silently
 * turns into `{}`). */
export function getPlayerStateSnapshot() {
  return {
    coins: state.coins,
    inventory: { ...state.inventory },
    collected: Array.from(state.collected),
    equipped: [...state.equipped] as EquipSlots,
    upgrades: { ...state.upgrades },
    xp: state.xp,
    level: state.level,
    statPoints: state.statPoints,
    bags: [...state.bags],
    bagId: state.bagId,
  };
}

/** For the save system: overwrite this module's state from a loaded
 * save. Called once, before the player can interact - see
 * docs/AUDIT.md's save-system notes in WorldScreen.tsx. */
export function restorePlayerState(data: {
  coins: number;
  inventory: Record<string, number>;
  collected: string[];
  equipped?: EquipSlots;
  upgrades?: Record<UpgradeStat, number>;
  xp?: number;
  level?: number;
  statPoints?: number;
  bags?: string[];
  bagId?: string;
}) {
  state.coins = data.coins;
  state.inventory = { ...data.inventory };
  state.collected = new Set(data.collected);
  // `equipped`/`upgrades` are optional: a save written before these
  // features existed won't have them - fall back to defaults rather than
  // crash on load. Slots pointing at an item the save no longer has are
  // cleared by the inventory check in getEquippedItems().
  state.equipped = data.equipped ? [data.equipped[0] ?? null, data.equipped[1] ?? null] : [null, null];
  state.upgrades = data.upgrades ? { ...data.upgrades } : freshUpgrades();
  // Saves from before the XP system have no level data: start at level 1.
  state.level = Math.min(MAX_PLAYER_LEVEL, Math.max(1, data.level ?? 1));
  state.xp = Math.max(0, data.xp ?? 0);
  state.statPoints = Math.max(0, data.statPoints ?? 0);
  state.bags = Array.from(new Set([DEFAULT_BAG, ...(data.bags ?? []).filter((b) => BAGS[b])]));
  state.bagId = data.bagId && state.bags.includes(data.bagId) ? data.bagId : DEFAULT_BAG;
  setBagEffects(bagEffectsOf(state.bagId));
  levelNotice = null;
  notify();
}

/** Brand-new world: starting coins, empty bag, no upgrades. */
export function resetPlayerState() {
  state.coins = 40;
  state.inventory = {};
  state.collected = new Set();
  state.equipped = [null, null];
  state.upgrades = freshUpgrades();
  state.xp = 0;
  state.level = 1;
  state.statPoints = 0;
  state.bags = [DEFAULT_BAG];
  state.bagId = DEFAULT_BAG;
  setBagEffects(bagEffectsOf(DEFAULT_BAG));
  levelNotice = null;
  notify();
}

/** Carried weight in kg (bag weight reduction applied) and distinct item slots in use. */
export function getBagUsage(): { slots: number; maxSlots: number; weight: number; maxWeight: number; bagId: string } {
  const bag = BAGS[state.bagId] ?? BAGS[DEFAULT_BAG];
  let weight = 0;
  let slots = 0;
  for (const [id, qty] of Object.entries(state.inventory)) {
    if (qty <= 0) continue;
    slots += 1;
    weight += (ITEMS[id]?.weight ?? 0.3) * qty;
  }
  return { slots, maxSlots: bag.slots, weight: weight * getBagEffects().weightMult, maxWeight: bag.maxWeight, bagId: bag.id };
}

/** How many of `quantity` fit in the bag right now (slot, weight and stack limits). */
export function bagRoomFor(itemId: string, quantity = 1): number {
  const u = getBagUsage();
  const have = state.inventory[itemId] ?? 0;
  if (have <= 0 && u.slots >= u.maxSlots) return 0;
  const unit = (ITEMS[itemId]?.weight ?? 0.3) * getBagEffects().weightMult;
  const byWeight = unit > 0 ? Math.floor((u.maxWeight - u.weight + 1e-6) / unit) : quantity;
  return Math.max(0, Math.min(quantity, byWeight, MAX_STACK - have));
}

/**
 * Puts items in the bag. Returns how many were added (less than asked if the
 * bag is full or too heavy). `force` ignores the limits (story items: mission
 * rewards, the guild parcel) so a quest can never get stuck on a full bag.
 */
export function addItem(itemId: string, quantity = 1, force = false): number {
  const n = force ? quantity : bagRoomFor(itemId, quantity);
  if (n <= 0) return 0;
  state.inventory[itemId] = (state.inventory[itemId] ?? 0) + n;
  notify();
  return n;
}

// ---- bags ----
export function getOwnedBags(): string[] {
  return [...state.bags];
}
export function getEquippedBagId(): string {
  return state.bagId;
}
/** Adds a bag to the collection (false if already owned). */
export function giveBag(bagId: string): boolean {
  if (!BAGS[bagId] || state.bags.includes(bagId)) return false;
  state.bags.push(bagId);
  notify();
  return true;
}
/** Switches to another bag you own. Refused (false) if what you carry wouldn't fit in it. */
export function equipBag(bagId: string): boolean {
  if (!state.bags.includes(bagId) || !BAGS[bagId]) return false;
  const bag = BAGS[bagId];
  let slots = 0;
  let weight = 0;
  for (const [id, qty] of Object.entries(state.inventory)) {
    if (qty <= 0) continue;
    slots += 1;
    weight += (ITEMS[id]?.weight ?? 0.3) * qty;
  }
  if (slots > bag.slots || weight * bagEffectsOf(bagId).weightMult > bag.maxWeight + 1e-6) return false;
  state.bagId = bagId;
  setBagEffects(bagEffectsOf(bagId));
  notify();
  return true;
}

export function itemCount(itemId: string): number {
  return state.inventory[itemId] ?? 0;
}

/** Takes items out of the bag (mission hand-ins). False (no-op) if there aren't enough. */
export function removeItem(itemId: string, quantity = 1): boolean {
  if ((state.inventory[itemId] ?? 0) < quantity) return false;
  state.inventory[itemId] -= quantity;
  if (state.inventory[itemId] <= 0) {
    delete state.inventory[itemId];
    for (const slot of [0, 1] as const) if (state.equipped[slot] === itemId) state.equipped[slot] = null;
  }
  notify();
  return true;
}

/* ---- XP / level / status points ---- */

/** Adds XP; returns how many levels were gained (each gives 1 status point). */
export function addXp(amount: number): number {
  if (amount <= 0) return 0;
  let gained = 0;
  if (state.level >= MAX_PLAYER_LEVEL) return 0;
  state.xp += Math.round(amount * getBagEffects().xpMult);
  while (state.level < MAX_PLAYER_LEVEL && state.xp >= xpToNext(state.level)) {
    state.xp -= xpToNext(state.level);
    state.level += 1;
    state.statPoints += pointsForReaching(state.level);
    gained += 1;
  }
  if (state.level >= MAX_PLAYER_LEVEL) state.xp = 0;
  if (gained > 0) {
    levelNotice = state.level;
    playSfx('levelup');
    haptic('success');
  }
  notify();
  return gained;
}

export function getLevel(): number {
  return state.level;
}
export function getStatPoints(): number {
  return state.statPoints;
}
export function getXpInfo(): { level: number; xp: number; need: number; points: number } {
  return { level: state.level, xp: state.xp, need: xpToNext(state.level), points: state.statPoints };
}

/** The world screen polls this to toast "NÍVEL N!" once (null when nothing new). */
export function takeLevelNotice(): number | null {
  const n = levelNotice;
  levelNotice = null;
  return n;
}

/** Puts an inventory item in a slot (or empties it with null). An item
 * already in the other slot moves, so the same item never sits in both. */
export function equipItem(slot: 0 | 1, itemId: string | null) {
  if (itemId !== null) {
    if (!ITEMS[itemId] || (state.inventory[itemId] ?? 0) <= 0) return;
    const other = slot === 0 ? 1 : 0;
    if (state.equipped[other] === itemId) state.equipped[other] = null;
  }
  state.equipped[slot] = itemId;
  notify();
}

/** The two slots, with any slot whose item ran out shown as empty. */
export function getEquippedItems(): EquipSlots {
  const ok = (id: string | null) => (id && (state.inventory[id] ?? 0) > 0 ? id : null);
  return [ok(state.equipped[0]), ok(state.equipped[1])];
}

/** Spends one item from a slot and returns its id (the caller applies
 * the effect with applyItemEffect). null if the slot is empty. NOTE:
 * calls notify() - call it from an event handler, never during render. */
export function consumeEquippedItem(slot: 0 | 1): string | null {
  const id = getEquippedItems()[slot];
  if (!id) return null;
  state.inventory[id] = (state.inventory[id] ?? 0) - 1;
  if (state.inventory[id] <= 0) {
    delete state.inventory[id];
    if (state.equipped[slot] === id) state.equipped[slot] = null;
  }
  notify();
  return id;
}

/** Spends STATUS POINTS to take one stat from its current level to the next.
 * Returns false (no-op) if already at MAX_LEVEL or the points are short. */
export function buyUpgrade(stat: UpgradeStat): boolean {
  const level = state.upgrades[stat];
  const cost = costForNextLevel(level);
  if (cost === null) return false;
  if (state.statPoints < cost) return false;
  state.statPoints -= cost;
  state.upgrades[stat] = Math.min(MAX_LEVEL, level + 1);
  notify();
  return true;
}

/** Spends status points on something other than an attribute (skills). */
export function spendStatPoints(n: number): boolean {
  if (n <= 0 || state.statPoints < n) return false;
  state.statPoints -= n;
  notify();
  return true;
}

export function addStatPoints(n: number) {
  if (n <= 0) return;
  state.statPoints += n;
  notify();
}

export function getUpgradeLevels(): Record<UpgradeStat, number> {
  return { ...state.upgrades };
}

export function isCollected(id: string): boolean {
  return state.collected.has(id);
}

export function markCollected(id: string) {
  state.collected.add(id);
  notify();
}

/** Subscribes a component to any player-state change, forcing a re-render. Cheap: this only fires on real events (pickup, purchase), never per-frame. */
export function usePlayerState() {
  'use no memo'; // module-level store: the React Compiler must not cache what we read from it
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = subscribe(() => setTick((n) => n + 1));
    return unsub;
  }, []);
  return {
    coins: state.coins,
    xp: state.xp,
    level: state.level,
    statPoints: state.statPoints,
    xpNeeded: xpToNext(state.level),
    // Fresh copies each render: the store mutates these in place, so the same reference would let memoised children keep stale values.
    inventory: { ...state.inventory },
    equipped: [...state.equipped] as EquipSlots,
    equippedItems: getEquippedItems(),
    upgrades: { ...state.upgrades },
    bags: [...state.bags],
    bagId: state.bagId,
  };
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
