import type { DeathCause, EntityRole } from './deathCause';

/**
 * Causa de morte de uma LUTA: quem estava do outro lado do ringue. Chefe e rival são citados pelo nome e pelo papel;
 * adversário de torre ou de missão de duelo é "inimigo"; criatura marinha (expansão) usa o papel 'creature' ou 'guardian'.
 * Se o golpe final foi veneno ou queimadura, o aviso diz isso e cita o responsável (`via`).
 */
export interface BattleDeathInput {
  kind: string;
  /** nome real do adversário (do chefe, do lutador): nunca "Inimigo" quando existe nome */
  opponentName: string;
  bossName?: string;
  /** papel explícito do adversário (criaturas e guardiões); sem ele vale o papel do tipo de luta */
  role?: EntityRole;
  lastHurtBy?: 'hit' | 'burn' | 'poison' | 'drowning' | 'pressure';
  /** Nome da região (afogamento e pressão numa luta submarina). */
  region?: string;
}

export function battleDeathCause(i: BattleDeathInput): DeathCause {
  // Morreu afogado ou esmagado no meio da luta: a causa é o ambiente, não o adversário.
  if (i.lastHurtBy === 'drowning' || i.lastHurtBy === 'pressure') return { kind: 'hazard', hazard: i.lastHurtBy, region: i.region };
  const role: EntityRole = i.role ?? (i.kind === 'boss' ? 'boss' : i.kind === 'rival' ? 'rival' : 'enemy');
  const name = (role === 'boss' && i.bossName) || i.opponentName;
  const via = i.lastHurtBy === 'burn' || i.lastHurtBy === 'poison' ? i.lastHurtBy : undefined;
  return { kind: 'entity', role, name, via };
}
