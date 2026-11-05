import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CharacterKey } from '@/game/battle/Fighter';

/**
 * ELENCO de lutadores jogáveis (VERSUS) e como cada um se desbloqueia. É da CONTA (vale para todos os mundos,
 * guardado fora dos saves). Dogge e Gadigago já vêm liberados; os outros são desbloqueados por conquistas na
 * história: derrotar um chefe pela primeira vez ou chegar a um andar da Torre. Todos já têm mecânica de luta
 * própria (os mesmos lutadores que aparecem como chefes e rivais), e as skins/cosméticos usam os sprites do
 * elenco (os sprites novos de orc, soldier, tank e dogking já estão em assets/legacy-sprites).
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
  { key: 'mystic', unlock: { kind: 'boss', bossId: 'boss_misteriosa' } },
  { key: 'green_dragon', unlock: { kind: 'boss', bossId: 'boss_fragments' } },
  { key: 'ice_dragon', unlock: { kind: 'boss', bossId: 'boss_gelo' } },
  { key: 'shadow_dragon', unlock: { kind: 'boss', bossId: 'boss_trevas' } },
  { key: 'troll_face', unlock: { kind: 'boss', bossId: 'boss_troll' } },
  { key: 'cara_tranquilo', unlock: { kind: 'boss', bossId: 'boss_chill' } },
  { key: 'tocao', unlock: { kind: 'boss', bossId: 'boss_tocao' } },
  { key: 'serafim', unlock: { kind: 'boss', bossId: 'boss_serafim' } },
  { key: 'capiroto', unlock: { kind: 'boss', bossId: 'boss_capiroto' } },
];

/** Nomes (em português, como no resto dos nomes de personagens) para avisos de desbloqueio. */
export const FIGHTER_NAME: Record<string, string> = {
  dogge: 'Dogge', gadigago: 'Gadigago', orc: 'Orc', soldier: 'Soldado', dogking: 'Rei dos Cães', tank: 'Tanque',
  ninja: 'Ninja', mystic: 'Místico', green_dragon: 'Dragão da Floresta', ice_dragon: 'Dragão do Gelo', shadow_dragon: 'Dragão Sombrio',
  troll_face: 'Troll Face', cara_tranquilo: 'Cara Tranquilo', tocao: 'Tocão', serafim: 'Serafim', capiroto: 'Capiroto',
};

const KEY = 'meme_fighter_roster_v1';
const DEFAULTS = ROSTER.filter((r) => r.unlock.kind === 'default').map((r) => r.key);
let unlocked: CharacterKey[] = [...DEFAULTS];
let loaded = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export async function ensureRosterLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as { unlocked?: string[] };
      const known = new Set(ROSTER.map((r) => r.key as string));
      unlocked = Array.from(new Set([...DEFAULTS, ...(d.unlocked ?? []).filter((k) => known.has(k))])) as CharacterKey[];
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

/** Desbloqueia o lutador (se ainda não tinha). Devolve true quando é novo. */
export function unlockFighter(key: CharacterKey): boolean {
  if (unlocked.includes(key)) return false;
  unlocked = [...unlocked, key];
  notify();
  AsyncStorage.setItem(KEY, JSON.stringify({ unlocked })).catch(() => {});
  return true;
}

/** Conquista: derrotar um chefe pela 1ª vez ou chegar a um andar da torre. Devolve os lutadores recém-liberados. */
export function unlockByEvent(ev: { boss?: string; floor?: number }): CharacterKey[] {
  const out: CharacterKey[] = [];
  for (const r of ROSTER) {
    const u = r.unlock;
    const hit = (u.kind === 'boss' && ev.boss === u.bossId) || (u.kind === 'tower' && ev.floor !== undefined && ev.floor >= u.floor);
    if (hit && unlockFighter(r.key)) out.push(r.key);
  }
  return out;
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
