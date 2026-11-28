import { NPCS, type NpcDef } from '@/game/world/npcs';
import { getQuestStatus, getStoryCharacterId } from '@/game/state/questState';
import { hasFlag } from '@/game/state/storyFlags';
import { getCampaign } from './campaigns/registry';

/**
 * NPCs com a cara da CAMPANHA: no mundo do Gadigago a praça tem o Dogge como rival e o Maior Fã como Mercador; no do Orc o
 * Eremita Tobias é o espião de capuz. As mudanças (nome, papel, sprite, falas) valem só naquela campanha; o resto do jogo
 * continua lendo NPCS direto. Quem desenha ou fala com um NPC pergunta aqui.
 */
export function npcFor(npcId: string, characterId: string = getStoryCharacterId()): NpcDef {
  const base = NPCS[npcId];
  const ov = getCampaign(characterId)?.npcOverrides[npcId];
  if (!base || !ov) return base;
  return {
    ...base,
    ...(ov.name !== undefined && { name: ov.name }),
    ...(ov.role !== undefined && { role: ov.role }),
    ...(ov.kind !== undefined && { kind: ov.kind }),
    ...(ov.fighterSprite !== undefined && { fighterSprite: ov.fighterSprite }),
    ...(ov.sheetChar !== undefined && { sheetChar: ov.sheetChar }),
    ...(ov.dialogue !== undefined && { dialogue: ov.dialogue }),
  };
}

/** Falas da campanha para esse NPC agora (primeira regra que vale, senão a fala padrão da campanha), ou null. */
export function campaignLinesFor(npcId: string, characterId: string = getStoryCharacterId()): string[] | null {
  const ov = getCampaign(characterId)?.npcOverrides[npcId];
  if (!ov) return null;
  const ctx = { done: (m: string) => getQuestStatus(m) === 'completed', flag: hasFlag };
  const rule = ov.rules?.find((r) => r.when(ctx));
  return rule ? rule.lines : ov.dialogue ?? null;
}
