import { getNpcDialogue, type NpcDef } from '@/game/world/npcs';
import { getChainNpcLines, getNpcQuest } from '@/game/state/questState';
import { storyLinesFor } from './storyDialogue';
import { isBossDefeated } from '@/game/state/bossState';
import { t } from '@/game/i18n/i18n';

// Contadores so da sessao (nao precisam ir para o save): cada conversa mostra a proxima dica / pegadinha.
let chillTalks = 0;
let trollTalks = 0;
export const CHILL_TIP_COUNT = 8;
export const CHILL_GREETING_COUNT = 3;

/** Cara Tranquilo: um cumprimento e a proxima dica do jogo (gira pelas 8). */
export function chillLines(n = chillTalks++): string[] {
  const hi = (n % CHILL_GREETING_COUNT) + 1;
  const tip = (n % CHILL_TIP_COUNT) + 1;
  return [t(`chill_hi_${hi}`), t(`chill_tip_${tip}`)];
}

/** Troll Face (perto dos barcos): uma pegadinha de 3 falas por conversa; depois de vencido na porta do cassino, reconhece a derrota. */
export function trollLines(n = trollTalks++): string[] {
  if (isBossDefeated('boss_troll')) return [t('troll_won1'), t('troll_won2')];
  const g = ['a', 'b', 'c'][n % 3];
  return [t(`troll_${g}1`), t(`troll_${g}2`), t(`troll_${g}3`)];
}

/** The NPC with the lines that fit the mission state right now (mission-specific lines win over the NPC's built-in ones). */
export function resolveNpcDialogue(npc: NpcDef): NpcDef {
  // A multi-step mission waiting for a talk with this NPC wins over everything else.
  const chainLines = getChainNpcLines(npc.id);
  if (chainLines) return { ...npc, dialogue: chainLines };
  if (npc.id === 'cara_tranquilo') return { ...npc, dialogue: chillLines() };
  if (npc.id === 'troll_trapaceiro') return { ...npc, dialogue: trollLines() };
  // As escolhas da história mudam o que o NPC diz (mas missão com fala própria ainda ativa vence).
  const q = getNpcQuest(npc.id);
  const story = storyLinesFor(npc.id);
  if (story && (!q || q.status === 'completed')) return { ...npc, dialogue: story };
  if (!q) return npc;
  const d = q.def.dialogue;
  if (d) {
    const lines = q.status === 'completed' ? d.completed : q.status === 'unstarted' ? d.unstarted : d.active;
    return { ...npc, dialogue: lines };
  }
  return { ...npc, dialogue: getNpcDialogue(npc, q.status) };
}
