import { useEffect, useState } from 'react';
import { COSMETIC_BY_ID, COSMETICS, type CosmeticSlot } from '@/game/cosmetics/cosmeticDefs';
import { getCoins, spendCoins } from './playerState';
import { registerSaveExt } from './saveExt';
import { getAccount, ownCosmetic, ownCosmetics, subscribeAccount } from '@/game/account/accountState';

/**
 * Cosméticos do jogador: o que tem e o que está vestindo.
 *  - O que a conta JÁ CONSEGUIU (chapéus, capas e skins) vale para TODOS os saves: fica na conta global
 *    (account/accountState.ts), então apagar ou trocar de save nunca perde um cosmético.
 *  - O que está VESTINDO (`equipped`, um id por categoria; null = padrão) é do save, na ext 'cosmetics'.
 */
export type Equipped = Record<CosmeticSlot, string | null>;

const EMPTY: Equipped = { hat: null, cape: null, skin: null };
let equipped: Equipped = { ...EMPTY };
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

const ownedSet = () => new Set(getAccount().cosmetics);
export function isOwned(id: string): boolean {
  return getAccount().cosmetics.includes(id);
}
export function getOwned(): string[] {
  return [...getAccount().cosmetics];
}
export function getOwnedCount(): number {
  return getAccount().cosmetics.length;
}
export function getEquipped(): Equipped {
  return equipped;
}

/** Compra com moedas (sem nenhum bônus ou desconto). false = já tem, não existe ou falta dinheiro. */
export function buyCosmetic(id: string): boolean {
  const def = COSMETIC_BY_ID[id];
  if (!def || isOwned(id)) return false;
  if (getCoins() < def.price || !spendCoins(def.price)) return false;
  ownCosmetic(id);
  notify();
  return true;
}

/** Dá um cosmético de graça (recompensa de missão). */
export function grantCosmetic(id: string) {
  if (!COSMETIC_BY_ID[id] || isOwned(id)) return;
  ownCosmetic(id);
  notify();
}

/** Veste (ou tira, com null) um cosmético que o jogador tem. */
export function equipCosmetic(slot: CosmeticSlot, id: string | null): boolean {
  if (id !== null) {
    const def = COSMETIC_BY_ID[id];
    if (!def || def.slot !== slot || !isOwned(id)) return false;
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
    const off = subscribeAccount(fn);
    return () => {
      listeners.delete(fn);
      off();
    };
  }, []);
  return { owned: getOwned(), equipped };
}

registerSaveExt({
  key: 'cosmetics',
  // `owned` continua indo no save só como cópia de segurança/compatibilidade; a fonte da verdade é a conta global.
  snapshot: () => ({ owned: getOwned(), equipped }),
  restore: (d) => {
    const data = d as { owned?: unknown; equipped?: Partial<Record<CosmeticSlot, unknown>> } | undefined;
    // Saves antigos guardavam os cosméticos dentro do próprio save: passam para a conta global (migração, sem perder nada).
    const legacy: string[] = [];
    if (Array.isArray(data?.owned)) for (const v of data.owned) if (typeof v === 'string' && COSMETIC_BY_ID[v]) legacy.push(v);
    ownCosmetics(legacy);
    const have = ownedSet();
    for (const v of legacy) have.add(v); // a conta ainda pode estar carregando: o que o save traz já vale para vestir
    const eq: Equipped = { ...EMPTY };
    for (const slot of Object.keys(EMPTY) as CosmeticSlot[]) {
      const v = data?.equipped?.[slot];
      if (typeof v === 'string' && have.has(v) && COSMETIC_BY_ID[v]?.slot === slot) eq[slot] = v;
    }
    equipped = eq;
    notify();
  },
  reset: () => {
    // só o que está vestido é do save; os cosméticos que a conta já tem continuam dela
    equipped = { ...EMPTY };
    notify();
  },
});

export const ALL_COSMETIC_IDS = COSMETICS.map((x) => x.id);
