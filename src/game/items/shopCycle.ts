import { ITEMS } from './itemDefs';
import { registerSaveExt } from '@/game/state/saveExt';

/**
 * Shops change with the day/night cycle: fresh food is only sold by day, some
 * special items only by night, and every shop runs "flash offers" (30% off,
 * a few units, a couple of minutes) that rotate on their own.
 */
const DAY_ONLY = new Set(['strawberry', 'milk', 'bread', 'banana']);
export const NIGHT_STOCK = ['moonshroom', 'moon_elixir', 'night_brew'];
/** Cada vendedor tem o seu estoque noturno: Marina vende os lunares comuns, Maximilian a poção de batalha. */
export type Vendor = 'common' | 'battle';
const NIGHT_BY_VENDOR: Record<Vendor, string[]> = { common: ['moonshroom', 'moon_elixir'], battle: ['night_brew'] };

export const FLASH_SLOT_MS = 2 * 60 * 1000;
export const FLASH_DISCOUNT = 0.3;
export const FLASH_COUNT = 2;

export function stockFor(base: string[], night: boolean, vendor?: Vendor): string[] {
  if (night) return [...base.filter((id) => !DAY_ONLY.has(id)), ...(vendor ? NIGHT_BY_VENDOR[vendor] : NIGHT_STOCK)];
  return base;
}

export interface FlashOffer {
  itemId: string;
  price: number; // discounted
  basePrice: number;
  left: number; // units still available
  slot: number;
}

function hash(a: number, b: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function strSeed(s: string): number {
  let h = 11;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) | 0;
  return h;
}

const bought: Record<string, number> = {};

export function flashSlot(totalMs: number): number {
  return Math.floor(totalMs / FLASH_SLOT_MS);
}
export function flashMsLeft(totalMs: number): number {
  return (flashSlot(totalMs) + 1) * FLASH_SLOT_MS - totalMs;
}

/** The current flash offers of a shop (deterministic per shop + time slot). */
export function flashOffers(shopKey: string, stock: string[], totalMs: number): FlashOffer[] {
  const slot = flashSlot(totalMs);
  const pool = stock.filter((id) => ITEMS[id]?.price !== null && ITEMS[id] && id !== 'meme_token' && id !== 'piolet');
  if (pool.length === 0) return [];
  const seed = strSeed(shopKey);
  const picked: string[] = [];
  for (let n = 0; picked.length < Math.min(FLASH_COUNT, pool.length) && n < 40; n++) {
    const id = pool[Math.floor(hash(slot * 7 + n, seed) * pool.length)];
    if (!picked.includes(id)) picked.push(id);
  }
  return picked.map((itemId, i) => {
    const base = ITEMS[itemId].price ?? 0;
    const qty = 1 + Math.floor(hash(slot * 13 + i, seed + 5) * 3);
    return {
      itemId,
      basePrice: base,
      price: Math.max(1, Math.round(base * (1 - FLASH_DISCOUNT))),
      left: Math.max(0, qty - (bought[`${shopKey}|${slot}|${itemId}`] ?? 0)),
      slot,
    };
  });
}

export function markFlashBought(shopKey: string, offer: FlashOffer) {
  const k = `${shopKey}|${offer.slot}|${offer.itemId}`;
  bought[k] = (bought[k] ?? 0) + 1;
}

registerSaveExt({
  key: 'shopFlash',
  snapshot: () => ({ bought }),
  restore: (d) => {
    for (const k of Object.keys(bought)) delete bought[k];
    const b = (d as { bought?: Record<string, number> } | undefined)?.bought;
    if (b) for (const [k, v] of Object.entries(b)) if (typeof v === 'number') bought[k] = v;
  },
  reset: () => {
    for (const k of Object.keys(bought)) delete bought[k];
  },
});
