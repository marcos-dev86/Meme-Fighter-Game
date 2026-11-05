import { BUILDING_DOORS, BUILDING_RECTS, FERRY_DOCKS, getWorldTile } from '@/game/world/worldGen';
import { getWorldPosition } from '@/game/state/worldPosition';
import { weatherAt, type Weather } from '@/game/state/weatherState';
import { DAY_MS, getCycleMs, getTotalMs, lightAt } from '@/game/state/timeState';

/**
 * Ambiente de uma luta que começa no mundo: o cenário depende de ONDE a luta
 * foi iniciada, e o clima e a hora do dia são os do mundo naquele momento.
 * Lutas do modo VERSUS não têm ambiente (cenário escolhido pelo jogador, dia).
 */
export type DayPhase = 'day' | 'dusk' | 'night' | 'dawn';

export interface BattleAmbience {
  /** Cenário escolhido pelo lugar (ver STAGE_DEFS em stages.ts: stage_1 montanhas ... stage_12 caverna). */
  stageKey: string;
  weather: Weather;
  /** 1 = pleno dia, 0 = noite profunda. */
  light: number;
  phase: DayPhase;
  island: string | null;
  /** Tom de cor da ilha (RGBA) para diferenciar o mesmo cenário em ilhas distintas; null = nenhum. */
  tint: string | null;
}

const DOCK_NEAR = 12; // tiles até um cais para valer como "plataforma de barco"
const SHORE_RADIUS = 6;
const VILLAGE_NEAR = 14; // tiles até um prédio para valer como vilarejo

/** Tom por ilha (some no mapa principal). */
const ISLAND_TINT: Record<string, string> = {
  gelo: 'rgba(160,205,255,0.12)',
  vulcao: 'rgba(255,90,30,0.14)',
  trevas: 'rgba(70,10,110,0.22)',
  misteriosa: 'rgba(30,130,110,0.12)',
};

/** Cenário de cada ilha (Urgente 3: um por lugar). A ilha principal decide pelo terreno em volta (ver stageForTile). */
const ISLAND_STAGE: Record<string, string> = {
  gelo: 'stage_5', // neve
  vulcao: 'stage_4', // vulcão
  trevas: 'stage_6', // trevas
  misteriosa: 'stage_7', // ilha misteriosa (perto do cassino: stage_8)
  fragments: 'stage_9', // floresta
  camp: 'stage_10', // acampamento
  dogisland: 'stage_11', // praia
};
/** Até onde (em tiles) do cassino a luta acontece no salão/rua do cassino. */
const CASINO_NEAR = 50;

/**
 * Regra do cenário (12 artes):
 *  - perto de plataforma de barco (cais) -> RIO OUTONAL (stage_3, o deque), em qualquer ilha;
 *  - ilhas com cenário próprio: neve, vulcão, trevas, misteriosa (cassino: salão), floresta, acampamento, praia;
 *  - ilha principal: neve/cinzas em volta -> NEVE/VULCÃO, beira d'água -> RIO OUTONAL, perto de prédios -> VILAREJO,
 *    resto (mato, floresta, montanha) -> MONTANHAS (stage_1).
 */
export function stageForTile(tx: number, ty: number, island?: string | null): string {
  for (const d of Object.values(FERRY_DOCKS)) {
    if (Math.hypot(d.anchor.x - tx, d.anchor.y - ty) <= DOCK_NEAR) return 'stage_3';
  }
  const own = island ? ISLAND_STAGE[island] : undefined;
  if (own) {
    const door = BUILDING_DOORS.loja_misteriosa;
    if (island === 'misteriosa' && door && Math.hypot(door.x - tx, door.y - ty) <= CASINO_NEAR) return 'stage_8';
    return own;
  }
  let wet = 0;
  let snow = 0;
  let ash = 0;
  let total = 0;
  for (let dy = -SHORE_RADIUS; dy <= SHORE_RADIUS; dy += 2) {
    for (let dx = -SHORE_RADIUS; dx <= SHORE_RADIUS; dx += 2) {
      const t = getWorldTile(tx + dx, ty + dy);
      total += 1;
      if (t === 'water' || t === 'dock' || t === 'sand') wet += 1;
      else if (t === 'snow') snow += 1;
      else if (t === 'ash' || t === 'lava') ash += 1;
    }
  }
  if (total > 0 && snow / total >= 0.4) return 'stage_5';
  if (total > 0 && ash / total >= 0.4) return 'stage_4';
  if (total > 0 && wet / total >= 0.22) return 'stage_3';
  for (const b of BUILDING_RECTS) {
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    if (Math.hypot(cx - tx, cy - ty) <= VILLAGE_NEAR) return 'stage_2';
  }
  return 'stage_1';
}

export function dayPhaseOf(light: number, cycleMs: number): DayPhase {
  if (light > 0.97) return 'day';
  if (light < 0.03) return 'night';
  // A luz cai no fim da metade do dia (entardecer) e sobe no fim da noite (amanhecer).
  return cycleMs <= DAY_MS ? 'dusk' : 'dawn';
}

/** Lê o mundo agora (posição, clima, hora). Devolve null se não houver posição conhecida (ex.: VERSUS). */
export function captureBattleAmbience(): BattleAmbience | null {
  const pos = getWorldPosition();
  if (!pos) return null;
  const island = pos.island ?? 'main';
  const total = getTotalMs();
  const cycle = getCycleMs();
  const light = lightAt(cycle);
  const weather = pos.sailing ? weatherAt('main', total) : weatherAt(island, total);
  return {
    stageKey: stageForTile(pos.tx, pos.ty, pos.sailing ? null : pos.island),
    weather,
    light,
    phase: dayPhaseOf(light, cycle),
    island: pos.island,
    tint: ISLAND_TINT[island] ?? null,
  };
}
