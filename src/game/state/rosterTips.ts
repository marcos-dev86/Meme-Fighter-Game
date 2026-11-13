import type { CharacterKey } from '@/game/battle/Fighter';
import { BOSS_BY_ID } from './bossState';
import { hasSeenTip, tip } from './tipsState';
import { FIGHTER_NAME, ROSTER, isFighterEarned } from './rosterState';

/**
 * DICAS DO JOGO sobre como liberar cada lutador do VERSUS. A tela de seleção NÃO mostra isso (só "BLOQUEADO"):
 * quem ensina é a dica. Cada visita à seleção oferece a dica do próximo lutador ainda não liberado que o jogador
 * ainda não viu (cada dica aparece uma vez por save, ver tipsState.ts). O texto é montado por `rosterTipText`.
 */
export const ROSTER_TIP_PREFIX = 'roster_';

/** Id da dica de um lutador. */
export function rosterTipId(key: CharacterKey): string {
  return `${ROSTER_TIP_PREFIX}${key}`;
}

/** Oferece a dica do próximo lutador bloqueado. Devolve o id oferecido (ou null se não há o que ensinar). */
export function offerRosterTip(): string | null {
  for (const r of ROSTER) {
    if (r.unlock.kind === 'default' || isFighterEarned(r.key)) continue;
    const id = rosterTipId(r.key);
    if (hasSeenTip(id)) continue; // já ensinou este: passa para o próximo
    tip(id);
    return id;
  }
  return null;
}

/** Texto da dica de lutador (ou null se o id não é de lutador). `t` é a função de tradução. */
export function rosterTipText(id: string, t: (key: string) => string): string | null {
  if (!id.startsWith(ROSTER_TIP_PREFIX)) return null;
  const key = id.slice(ROSTER_TIP_PREFIX.length) as CharacterKey;
  const entry = ROSTER.find((r) => r.key === key);
  if (!entry) return null;
  const name = FIGHTER_NAME[key] ?? key;
  const u = entry.unlock;
  if (u.kind === 'boss') return `${name}: ${t('roster_hint_boss').replace('{name}', BOSS_BY_ID[u.bossId]?.name ?? '?')} ${t('roster_hint_pay')}`;
  if (u.kind === 'tower') return `${name}: ${t('roster_hint_tower').replace('{n}', String(u.floor))} ${t('roster_hint_pay')}`;
  return null;
}
