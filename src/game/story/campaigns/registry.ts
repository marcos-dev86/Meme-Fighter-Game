import type { CampaignChoice, CampaignDef, CampaignEnding } from './campaignTypes';
import { GADIGAGO_CAMPAIGN } from './gadigago';
import { ORC_CAMPAIGN } from './orc';

/**
 * Todas as campanhas além da do Dogge (que tem os próprios arquivos), por id do personagem. PURO.
 * Cada lote novo acrescenta a sua campanha aqui; characters.ts, as cutscenes, as escolhas e os NPCs leem deste mapa.
 */
export const CAMPAIGNS: Record<string, CampaignDef> = {
  gadigago: GADIGAGO_CAMPAIGN,
  orc: ORC_CAMPAIGN,
};

export const getCampaign = (id: string | null | undefined): CampaignDef | null => (id && CAMPAIGNS[id]) || null;

export const ALL_CAMPAIGN_CHOICES: CampaignChoice[] = Object.values(CAMPAIGNS).flatMap((c) => c.choices);
export const ALL_CAMPAIGN_ENDINGS: CampaignEnding[] = Object.values(CAMPAIGNS).flatMap((c) => c.endings);

/** O final alcançado numa campanha: o primeiro cuja bandeira está ligada (ou null). */
export function pickCampaignEnding(campaignId: string, hasFlag: (f: string) => boolean): CampaignEnding | null {
  return getCampaign(campaignId)?.endings.find((e) => hasFlag(e.flag)) ?? null;
}
