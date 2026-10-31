import { useEffect, useState } from 'react';
import { COSMETIC_BY_ID, COSMETICS, type CosmeticSlot } from '@/game/cosmetics/cosmeticDefs';
import { getCoins, spendCoins } from './playerState';
import { registerSaveExt } from './saveExt';

/**
 * Cosméticos do jogador: o que tem e o que está vestindo. Salvo em ext 'cosmetics'.
 * `equipped` guarda um id por categoria (ou null = sem chapéu/capa/skin padrão).
 */
export type Equipped = Record<CosmeticSlot, string | null>;

const EMPTY: Equipped = { hat: null, cape: null, skin: null };
let owned = new Set<string>();
let equipped: Equipped = { ...EMPTY };
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function isOwned(id: string): boolean {
  return owned.has(id);
}
export function getOwned(): string[] {
  return [...owned];
}
export function getOwnedCount(): number {
  return owned.size;
}
export function getEquipped(): Equipped {
  return equipped;
}

/** Compra com moedas (sem nenhum bônus ou desconto). false = já tem, não existe ou falta dinheiro. */
export function buyCosmetic(id: string): boolean {
  const def = COSMETIC_BY_ID[id];
  if (!def || owned.has(id)) return false;
  if (getCoins() < def.price || !spendCoins(def.price)) return false;
  owned = new Set(owned).add(id);
  notify();
  return true;
}

/** Dá um cosmético de graça (recompensa de missão). */
export function grantCosmetic(id: string) {
  if (!COSMETIC_BY_ID[id] || owned.has(id)) return;
  owned = new Set(owned).add(id);
  notify();
}

/** Veste (ou tira, com null) um cosmético que o jogador tem. */
export function equipCosmetic(slot: CosmeticSlot, id: string | null): boolean {
  if (id !== null) {
    const def = COSMETIC_BY_ID[id];
    if (!def || def.slot !== slot || !owned.has(id)) return false;
  }
  equipped = { ...equipped, [slot]: id };
  notify();
  return true;
}

export function useCosmetics(): { owned: string[]; equipped: Equipped } {
  'use no memo'; // store de módulo: o compilador do React não pode guardar em cache o que lemos aqui
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return { owned: [...owned], equipped };
}

registerSaveExt({
  key: 'cosmetics',
  snapshot: () => ({ owned: [...owned], equipped }),
  restore: (d) => {
    const data = d as { owned?: unknown; equipped?: Partial<Record<CosmeticSlot, unknown>> } | undefined;
    const have = new Set<string>();
    if (Array.isArray(data?.owned)) for (const v of data.owned) if (typeof v === 'string' && COSMETIC_BY_ID[v]) have.add(v);
    owned = have;
    const eq: Equipped = { ...EMPTY };
    for (const slot of Object.keys(EMPTY) as CosmeticSlot[]) {
      const v = data?.equipped?.[slot];
      if (typeof v === 'string' && have.has(v) && COSMETIC_BY_ID[v]?.slot === slot) eq[slot] = v;
    }
    equipped = eq;
    notify();
  },
  reset: () => {
    owned = new Set();
    equipped = { ...EMPTY };
    notify();
  },
});

export const ALL_COSMETIC_IDS = COSMETICS.map((x) => x.id);
