import { migrateLegacyIds } from './legacyIds';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CharacterKey } from '@/game/battle/Fighter';
import { noteFighterUnlocked, spendDiamonds } from '@/game/account/accountState';
import { fighterPrice } from './rosterPricing';

/**
 * ELENCO de lutadores jogáveis (VERSUS) e como cada um se desbloqueia. É da CONTA (vale para todos os mundos,
 * guardado fora dos saves). Dogge e Gadigago já vêm liberados. Os outros têm DUAS etapas:
 *   1. LIBERAR (earned): conquista na história (derrotar um chefe pela 1ª vez ou chegar a um andar da Torre);
 *   2. COMPRAR (unlocked): pagar em diamantes o preço do lutador (rosterPricing.ts, de 30 a 150 💎 ou mais).
 * Só o lutador COMPRADO pode ser escolhido. Contas antigas, que já tinham lutadores liberados, mantêm todos eles. Todos já têm mecânica de luta
 * própria (os mesmos lutadores que aparecem como chefes e rivais), e as skins/cosméticos usam os sprites do
 * elenco (os sprites de todos os lutadores estão em assets/sprites-v2).
 */
export type UnlockRule = { kind: 'default' } | { kind: 'boss'; bossId: string } | { kind: 'tower'; floor: number };

export interface RosterEntry {
  key: CharacterKey;
  unlock: UnlockRule;
}

export const ROSTER: RosterEntry[] = [
  { key: 'dogge', unlock: { kind: 'default' } },
  { key: 'gadigago', unlock: { kind: 'default' } },
  { key: 'orc', unlock: { kind: 'tower', floor: 10 } },
  { key: 'soldier', unlock: { kind: 'boss', bossId: 'boss_camp' } },
  { key: 'dogking', unlock: { kind: 'boss', bossId: 'boss_dogisland' } },
  { key: 'tank', unlock: { kind: 'boss', bossId: 'boss_vulcao' } },
  { key: 'ninja', unlock: { kind: 'boss', bossId: 'boss_main' } },
  // Expansão marítima: o rei das águas, liberado ao derrotar o Sea Beast (e comprado com diamantes, como os outros).
  { key: 'poseidon', unlock: { kind: 'boss', bossId: 'boss_sea_beast' } },
  { key: 'mystic', unlock: { kind: 'boss', bossId: 'boss_misteriosa' } },
  { key: 'green_dragon', unlock: { kind: 'boss', bossId: 'boss_fragments' } },
  { key: 'ice_dragon', unlock: { kind: 'boss', bossId: 'boss_gelo' } },
  { key: 'shadow_dragon', unlock: { kind: 'boss', bossId: 'boss_trevas' } },
  { key: 'troll_face', unlock: { kind: 'boss', bossId: 'boss_troll' } },
  { key: 'cara_tranquilo', unlock: { kind: 'boss', bossId: 'boss_chill' } },
  { key: 'sahur', unlock: { kind: 'boss', bossId: 'boss_sahur' } },
  { key: 'sahur_god', unlock: { kind: 'boss', bossId: 'boss_sahur_god' } },
  { key: 'sahur_evil', unlock: { kind: 'boss', bossId: 'boss_sahur_evil' } },
];

/** Nomes (em português, como no resto dos nomes de personagens) para avisos de desbloqueio. */
export const FIGHTER_NAME: Record<string, string> = {
  dogge: 'Dogge', gadigago: 'Gadigago', orc: 'Orc', soldier: 'Soldado', dogking: 'Rei dos Cães', tank: 'Tanque',
  poseidon: 'Rei Poseidon', ninja: 'Ninja', mystic: 'Místico', green_dragon: 'Dragão da Floresta', ice_dragon: 'Dragão do Gelo', shadow_dragon: 'Dragão Sombrio',
  troll_face: 'Troll Face', cara_tranquilo: 'Cara Tranquilo', sahur: 'Sahur', sahur_god: 'Sahur God', sahur_evil: 'Sahur Evil',
};

const KEY = 'meme_fighter_roster_v1';
const DEFAULTS = ROSTER.filter((r) => r.unlock.kind === 'default').map((r) => r.key);
/** Comprados (jogáveis). */
let unlocked: CharacterKey[] = [...DEFAULTS];
/** Liberados pela história, à espera de compra (inclui os já comprados). */
let earned: CharacterKey[] = [...DEFAULTS];
let loaded = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export async function ensureRosterLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(migrateLegacyIds(raw)) as { unlocked?: string[] };
      const known = new Set(ROSTER.map((r) => r.key as string));
      const d2 = d as { unlocked?: string[]; earned?: string[] };
      unlocked = Array.from(new Set([...DEFAULTS, ...(d2.unlocked ?? []).filter((k) => known.has(k))])) as CharacterKey[];
      // Saves antigos não tinham "earned": quem já tinha o lutador continua com ele.
      earned = Array.from(new Set([...unlocked, ...(d2.earned ?? []).filter((k) => known.has(k))])) as CharacterKey[];
      notify();
    }
  } catch {
    // sem armazenamento: continua só com os padrão
  }
}

export function isFighterUnlocked(key: CharacterKey): boolean {
  return unlocked.includes(key);
}
export function getUnlockedFighters(): CharacterKey[] {
  return unlocked;
}
/** A história já liberou o lutador (pode estar à espera de compra)? */
export function isFighterEarned(key: CharacterKey): boolean {
  return earned.includes(key);
}
export function getEarnedFighters(): CharacterKey[] {
  return earned;
}

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify({ unlocked, earned })).catch(() => {});
}

/** Entrega o lutador de vez (já pago). Devolve true quando é novo. */
export function unlockFighter(key: CharacterKey): boolean {
  if (unlocked.includes(key)) return false;
  unlocked = [...unlocked, key];
  if (!earned.includes(key)) earned = [...earned, key];
  noteFighterUnlocked(key); // conquistas de elenco
  notify();
  persist();
  return true;
}

export type BuyFighterResult = { ok: true; price: number } | { ok: false; reason: 'owned' | 'not_earned' | 'poor' };

/** Compra um lutador já liberado, em diamantes. Nada é cobrado se falhar. */
export function buyFighter(key: CharacterKey): BuyFighterResult {
  if (unlocked.includes(key)) return { ok: false, reason: 'owned' };
  if (!earned.includes(key)) return { ok: false, reason: 'not_earned' };
  const price = fighterPrice(key);
  if (!spendDiamonds(price)) return { ok: false, reason: 'poor' };
  unlockFighter(key);
  return { ok: true, price };
}

/** Conquista: derrotar um chefe pela 1ª vez ou chegar a um andar da torre. Libera para COMPRA; devolve os recém-liberados. */
export function unlockByEvent(ev: { boss?: string; floor?: number }): CharacterKey[] {
  const out: CharacterKey[] = [];
  for (const r of ROSTER) {
    const u = r.unlock;
    const hit = (u.kind === 'boss' && ev.boss === u.bossId) || (u.kind === 'tower' && ev.floor !== undefined && ev.floor >= u.floor);
    if (hit && !earned.includes(r.key)) {
      earned = [...earned, r.key];
      out.push(r.key);
    }
  }
  if (out.length) {
    notify();
    persist();
  }
  return out;
}

/** Liberados pela história (para a tela de seleção saber quem pode ser comprado). */
export function useRosterEarned(): CharacterKey[] {
  'use no memo'; // store de módulo
  const [, setTick] = useState(0);
  useEffect(() => {
    void ensureRosterLoaded();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return earned;
}

export function useRoster(): CharacterKey[] {
  'use no memo'; // store de módulo
  const [, setTick] = useState(0);
  useEffect(() => {
    void ensureRosterLoaded();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return unlocked;
}
