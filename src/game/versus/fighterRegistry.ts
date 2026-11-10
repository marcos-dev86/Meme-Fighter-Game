import type { CharacterKey } from '@/game/battle/Fighter';
import { createFighter } from '@/game/battle/Fighter';
import { getLayoutAspect, getSprite, SPRITE_ASPECTS } from '@/game/battle/sprites';
import { AVATAR_ART } from '@/game/account/avatarArt';
import { ROSTER, type UnlockRule } from '@/game/state/rosterState';
import { CHAR_LABEL } from './fighterLabels';

/**
 * REGISTRO dos lutadores da seleção do VERSUS: uma entrada por lutador, montada a partir do que já existe (ROSTER = ordem e regra
 * de desbloqueio, CHAR_LABEL = nome, AVATAR_ART = ícone da grade, sprites-v2 = retrato grande, createFighter = números de luta).
 * Para ADICIONAR um lutador novo: acrescente-o ao ROSTER, ao CHAR_LABEL e aos assets; a tela não precisa mudar.
 */
export interface FighterStats {
  /** 0..1, relativo ao maior valor do elenco. */
  health: number;
  speed: number;
  force: number;
}

export interface FighterEntry {
  key: CharacterKey;
  name: string;
  avatar: number;
  portrait: number;
  /** largura / altura do retrato. */
  portraitAspect: number;
  unlock: UnlockRule;
  stats: FighterStats;
}

interface Raw { health: number; speed: number; force: number }

function rawStats(key: CharacterKey): Raw {
  const f = createFighter(key, getLayoutAspect(key));
  return { health: f.maxHealth, speed: f.speed, force: (f.flashDamage + f.strongDamage + f.ultimateDamage) / 3 };
}

/** Normaliza os números de luta pelo maior do elenco (barras de 0 a 1; mínimo 0,15 para a barra sempre aparecer). */
export function normalizeStats(all: Raw[]): FighterStats[] {
  const max = { health: 1, speed: 1, force: 1 };
  for (const r of all) {
    max.health = Math.max(max.health, r.health);
    max.speed = Math.max(max.speed, r.speed);
    max.force = Math.max(max.force, r.force);
  }
  const n = (v: number, m: number) => Math.min(1, Math.max(0.15, v / m));
  return all.map((r) => ({ health: n(r.health, max.health), speed: n(r.speed, max.speed), force: n(r.force, max.force) }));
}

let cache: FighterEntry[] | null = null;

export function getFighterRegistry(): FighterEntry[] {
  if (cache) return cache;
  const raws = ROSTER.map((r) => rawStats(r.key));
  const stats = normalizeStats(raws);
  cache = ROSTER.map((r, i) => ({
    key: r.key,
    name: CHAR_LABEL[r.key],
    avatar: AVATAR_ART[r.key],
    portrait: getSprite(r.key, 'portrait'),
    portraitAspect: SPRITE_ASPECTS[r.key]?.portrait ?? SPRITE_ASPECTS[r.key]?.idle ?? 1,
    unlock: r.unlock,
    stats: stats[i],
  }));
  return cache;
}
