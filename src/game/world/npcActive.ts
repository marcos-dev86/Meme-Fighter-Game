import { getLight, getTotalMs } from '@/game/state/timeState';
import { isRainy, weatherAt } from '@/game/state/weatherState';
import { isBossDefeated } from '@/game/state/bossState';
import { getQuestStatus, getStoryCharacterId } from '@/game/state/questState';
import { getCampaign } from '@/game/story/campaigns/registry';
import type { OutdoorPlacement } from './npcs';

/** NPC extra de campanha: só no mundo do personagem certo, depois/antes das missões marcadas. */
export function campaignGate(p: OutdoorPlacement): boolean {
  if (p.campaign && getStoryCharacterId() !== p.campaign) return false;
  if (p.afterMission && getQuestStatus(p.afterMission) !== 'completed') return false;
  if (p.hideAfterMission && getQuestStatus(p.hideAfterMission) === 'completed') return false;
  return true;
}

/** NPCs secretos só existem à noite ou na chuva (OutdoorPlacement.only). Os demais estão sempre lá. Algumas campanhas os deixam sempre ativos. */
export function isPlacementActive(p: OutdoorPlacement): boolean {
  if (!campaignGate(p)) return false;
  if (p.after && !isBossDefeated(p.after)) return false;
  if (!p.only) return true;
  if (getCampaign(getStoryCharacterId())?.alwaysActive.includes(p.npcId)) return true;
  if (p.only === 'night') return getLight() < 0.4;
  return isRainy(weatherAt('main', getTotalMs()));
}
