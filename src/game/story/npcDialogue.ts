import { getNpcDialogue, type NpcDef } from '@/game/world/npcs';
import { getChainNpcLines, getNpcQuest } from '@/game/state/questState';
import { storyLinesFor } from './storyDialogue';

/** The NPC with the lines that fit the mission state right now (mission-specific lines win over the NPC's built-in ones). */
export function resolveNpcDialogue(npc: NpcDef): NpcDef {
  // A multi-step mission waiting for a talk with this NPC wins over everything else.
  const chainLines = getChainNpcLines(npc.id);
  if (chainLines) return { ...npc, dialogue: chainLines };
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
