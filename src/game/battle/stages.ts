/**
 * Cenários de batalha (dados puros, sem imagens: as artes ficam em src/game/menu/art.ts).
 * 1-3 são os originais (montanhas, vilarejo, rio outonal); 4-12 foram feitos na Urgente 3 (tools/make_stages.py), um por lugar/bioma.
 */
export interface StageDef {
  key: string;
  /** false = cenário fechado (cassino, caverna): uma arte só, sem dia/entardecer/noite */
  variants?: boolean;
  /** chave de tradução do nome (stringsUrgente3.ts) */
  nameKey: string;
  /** altura (arena 1280x720) em que os pés dos lutadores ficam */
  feetY: number;
}

export const STAGE_DEFS: StageDef[] = [
  { key: 'stage_1', variants: true, nameKey: 'stage_name_1', feetY: 600 }, // montanhas
  { key: 'stage_2', variants: true, nameKey: 'stage_name_2', feetY: 670 }, // vilarejo
  { key: 'stage_3', variants: true, nameKey: 'stage_name_3', feetY: 630 }, // rio outonal
  { key: 'stage_4', variants: true, nameKey: 'stage_name_4', feetY: 600 }, // vulcão
  { key: 'stage_5', variants: true, nameKey: 'stage_name_5', feetY: 600 }, // neve
  { key: 'stage_6', variants: true, nameKey: 'stage_name_6', feetY: 600 }, // trevas
  { key: 'stage_7', variants: true, nameKey: 'stage_name_7', feetY: 600 }, // ilha misteriosa
  { key: 'stage_8', nameKey: 'stage_name_8', feetY: 612 }, // salão do cassino
  { key: 'stage_9', variants: true, nameKey: 'stage_name_9', feetY: 600 }, // floresta
  { key: 'stage_10', variants: true, nameKey: 'stage_name_10', feetY: 600 }, // acampamento
  { key: 'stage_11', variants: true, nameKey: 'stage_name_11', feetY: 600 }, // praia
  { key: 'stage_12', nameKey: 'stage_name_12', feetY: 600 }, // caverna
];

export const STAGE_KEYS: string[] = STAGE_DEFS.map((s) => s.key);
export const STAGE_FEET: Record<string, number> = Object.fromEntries(STAGE_DEFS.map((s) => [s.key, s.feetY]));

/** Versões do cenário: dia, amanhecer/pôr do sol (o mesmo desenho) e noite. */
export type StageVariant = 'day' | 'dusk' | 'night';
export const STAGE_VARIANTS: StageVariant[] = ['day', 'dusk', 'night'];

/** Qual versão usar para a luz do mundo (1 = pleno dia, 0 = noite profunda). */
export function stageVariantForLight(light: number): StageVariant {
  if (light < 0.35) return 'night';
  if (light < 0.85) return 'dusk';
  return 'day';
}

export function hasStageVariants(key: string): boolean {
  return !!STAGE_DEFS.find((s) => s.key === key)?.variants;
}
