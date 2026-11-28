import type { Fighter } from './Fighter';
import type { IconName } from '@/game/ui/iconRegistry';

/**
 * Habilidades SUPREMAS (o último nó de cada árvore individual, exclusivo de um personagem). PURO: sem React nem estado
 * do jogo, testável no Node. O lutador guarda só o contador da luta (`fighter.supreme`); nada disso vai para o save
 * (a suprema é reaplicada pelo applySkills a partir dos nós aprendidos, e `attachSupreme` é idempotente).
 *
 * Ganchos chamados pela BattleScreen:
 *  - supremeBeforeHit  : antes de sortear o dano de quem ataca (crítico garantido, bônus de crítico);
 *  - supremeAfterHit   : depois do golpe de quem ataca (combo, energia);
 *  - supremeAfterDamaged: depois do golpe em quem defende (quebra de combo, gatilho de vida baixa);
 *  - tickSupreme       : a cada quadro (janela do combo, duração do estado).
 * Cada gancho devolve eventos de feedback (texto e cor) que a tela mostra com banner e partículas.
 */
type Five = [string, string, string, string, string];

export interface SupremeInfo {
  id: string;
  characterId: string;
  icon: IconName;
  name: Five;
  desc: Five;
  usage: Five;
}

export interface SupremeEvent {
  /** Chave de tradução do texto curto mostrado na luta. */
  key: string;
  /** 'r,g,b' das partículas. */
  color: string;
  sfx: 'charge' | 'levelup' | 'hit_heavy';
  /** Mostrar também como faixa no topo (só para eventos importantes). */
  banner: boolean;
}

export interface SupremeState {
  /** Trofeu da Revanche: acertos seguidos (0..TROFEU_MAX_STACKS). */
  stacks: number;
  /** ms desde o último acerto que contou para o combo. */
  idleMs: number;
  /** Ordem Recusada: ms restantes do estado de desobediência (0 = inativo). */
  activeMs: number;
  /** Ordem Recusada: já usada nesta luta (só uma vez por luta; não reinicia a cada round). */
  used: boolean;
}

export const TROFEU_MAX_STACKS = 5;
export const TROFEU_WINDOW_MS = 2500;
export const TROFEU_CRIT_MULT_BONUS = 0.6;
export const TROFEU_ENERGY_REFUND = 10;
export const TROFEU_COMEBACK_CRIT = 0.08;

export const ORDEM_TRIGGER_HP = 0.35;
export const ORDEM_DURATION_MS = 6000;
export const ORDEM_TAKEN_MULT = 0.65;
export const ORDEM_DAMAGE_MULT = 1.2;

export const SUPREMES: Record<string, SupremeInfo> = {
  trofeu_revanche: {
    id: 'trofeu_revanche',
    characterId: 'gadigago',
    icon: 'ab_sup_trofeu_revanche',
    name: ['Troféu da Revanche', 'Trophy of Revenge', 'Trofeo de la Revancha', 'Trophée de la Revanche', '雪辱のトロフィー'],
    desc: [
      'Cada golpe que acerta sem ser bloqueado soma 1 no combo (máximo 5; zera após 2,5 s sem acertar ou ao levar dano). Com o combo cheio, o próximo golpe é crítico garantido com +60% de dano crítico e devolve 10 de energia. Enquanto estiver com menos vida que o oponente: +8 pontos de chance de crítico.',
      'Every hit that lands unblocked adds 1 to the combo (max 5; resets after 2.5 s without hitting or when you take damage). With a full combo, the next hit is a guaranteed critical with +60% critical damage and refunds 10 energy. While you have less health than your opponent: +8 points of critical chance.',
      'Cada golpe que acierta sin ser bloqueado suma 1 al combo (máximo 5; se reinicia tras 2,5 s sin acertar o al recibir daño). Con el combo lleno, el siguiente golpe es crítico garantizado con +60% de daño crítico y devuelve 10 de energía. Con menos vida que el rival: +8 puntos de probabilidad de crítico.',
      'Chaque coup non bloqué qui touche ajoute 1 au combo (max 5 ; remis à zéro après 2,5 s sans toucher ou en subissant des dégâts). Combo plein : le coup suivant est un critique garanti avec +60% de dégâts critiques et rend 10 d’énergie. Avec moins de vie que l’adversaire : +8 points de chance de critique.',
      'ブロックされずに命中するたびにコンボが1増える（最大5。2.5秒命中しない、またはダメージを受けるとリセット）。コンボが満タンの次の攻撃は必ずクリティカルになり、クリティカルダメージ+60%、エネルギー10回復。相手より体力が少ない間はクリティカル率+8ポイント。',
    ],
    usage: ['Automática, em toda luta.', 'Automatic, in every fight.', 'Automática, en toda pelea.', 'Automatique, à chaque combat.', '自動発動、全ての戦闘で有効。'],
  },
  ordem_recusada: {
    id: 'ordem_recusada',
    characterId: 'orc',
    icon: 'ab_sup_ordem_recusada',
    name: ['Ordem Recusada', 'Order Refused', 'Orden Rechazada', 'Ordre Refusé', '拒まれた命令'],
    desc: [
      'Uma vez por luta, ao cair a 35% de vida ou menos, o Orc recusa a ordem de cair: por 6 s recebe 35% menos dano, causa 20% mais dano e fica imune a atordoamento e congelamento.',
      'Once per fight, when health falls to 35% or less, the Orc refuses the order to fall: for 6 s he takes 35% less damage, deals 20% more damage and is immune to stun and freeze.',
      'Una vez por pelea, al caer al 35% de vida o menos, el Orco rechaza la orden de caer: durante 6 s recibe un 35% menos de daño, causa un 20% más y es inmune al aturdimiento y la congelación.',
      'Une fois par combat, quand la vie tombe à 35% ou moins, l’Orc refuse l’ordre de tomber : pendant 6 s il subit 35% de dégâts en moins, inflige 20% de plus et est immunisé à l’étourdissement et au gel.',
      '1戦に1回、体力が35%以下になるとオークは倒れろという命令を拒む。6秒間、受けるダメージ-35%、与えるダメージ+20%、気絶と凍結を無効化する。',
    ],
    usage: ['Automática, uma vez por luta.', 'Automatic, once per fight.', 'Automática, una vez por pelea.', 'Automatique, une fois par combat.', '自動発動、1戦に1回。'],
  },
};

export function newSupremeState(): SupremeState {
  return { stacks: 0, idleMs: 0, activeMs: 0, used: false };
}

/** Liga a suprema ao lutador. Idempotente: aplicar de novo (recarregar, trocar de tela) não duplica nem reinicia nada. */
export function attachSupreme(f: Fighter, id: string): boolean {
  if (!SUPREMES[id] || f.supremeId === id) return false;
  f.supremeId = id;
  f.supreme = newSupremeState();
  return true;
}

export interface BeforeHit {
  critBonus: number;
  critMultBonus: number;
  forceCrit: boolean;
}
const NONE: BeforeHit = { critBonus: 0, critMultBonus: 0, forceCrit: false };

export function supremeBeforeHit(attacker: Fighter, defender: Fighter): BeforeHit {
  if (attacker.supremeId !== 'trofeu_revanche' || !attacker.supreme) return NONE;
  const full = attacker.supreme.stacks >= TROFEU_MAX_STACKS;
  const behind = attacker.health / attacker.maxHealth < defender.health / defender.maxHealth;
  return { critBonus: behind ? TROFEU_COMEBACK_CRIT : 0, critMultBonus: full ? TROFEU_CRIT_MULT_BONUS : 0, forceCrit: full };
}

export interface AfterHit {
  dealt: number;
  blocked: boolean;
  /** O golpe usou o crítico garantido do combo cheio. */
  forced: boolean;
}

export function supremeAfterHit(attacker: Fighter, info: AfterHit): SupremeEvent[] {
  const st = attacker.supreme;
  if (attacker.supremeId !== 'trofeu_revanche' || !st) return [];
  if (info.forced) {
    st.stacks = 0;
    st.idleMs = 0;
    attacker.gainEnergy(TROFEU_ENERGY_REFUND);
    return [{ key: 'sup_trofeu_hit', color: '255,210,60', sfx: 'hit_heavy', banner: true }];
  }
  if (info.blocked || info.dealt <= 0) return [];
  st.idleMs = 0;
  if (st.stacks < TROFEU_MAX_STACKS) {
    st.stacks += 1;
    if (st.stacks === TROFEU_MAX_STACKS) return [{ key: 'sup_trofeu_ready', color: '255,150,40', sfx: 'charge', banner: true }];
  }
  return [];
}

export function supremeAfterDamaged(defender: Fighter, info: { dealt: number; blocked: boolean }): SupremeEvent[] {
  const st = defender.supreme;
  if (!st) return [];
  if (defender.supremeId === 'trofeu_revanche') {
    if (!info.blocked && info.dealt > 0) {
      st.stacks = 0;
      st.idleMs = 0;
    }
    return [];
  }
  if (defender.supremeId === 'ordem_recusada') {
    if (!st.used && !defender.isKO && defender.health > 0 && defender.health <= defender.maxHealth * ORDEM_TRIGGER_HP) {
      st.used = true;
      st.activeMs = ORDEM_DURATION_MS;
      defender.tempTakenMult = ORDEM_TAKEN_MULT;
      defender.tempDamageMult = ORDEM_DAMAGE_MULT;
      defender.statusGuardMs = ORDEM_DURATION_MS;
      defender.status = { ...defender.status, stun: 0, freeze: 0 };
      return [{ key: 'sup_ordem_on', color: '120,230,90', sfx: 'levelup', banner: true }];
    }
  }
  return [];
}

export function tickSupreme(f: Fighter, dtMs: number): SupremeEvent[] {
  const st = f.supreme;
  if (!st) return [];
  if (f.supremeId === 'trofeu_revanche' && st.stacks > 0 && st.stacks < TROFEU_MAX_STACKS) {
    st.idleMs += dtMs;
    if (st.idleMs >= TROFEU_WINDOW_MS) {
      st.stacks = 0;
      st.idleMs = 0;
    }
  }
  if (f.supremeId === 'ordem_recusada' && st.activeMs > 0) {
    st.activeMs = Math.max(0, st.activeMs - dtMs);
    f.statusGuardMs = st.activeMs;
    if (st.activeMs <= 0) endOrdem(f);
  }
  return [];
}

function endOrdem(f: Fighter) {
  f.tempTakenMult = 1;
  f.tempDamageMult = 1;
  f.statusGuardMs = 0;
}

/** Novo round: o combo zera e o estado temporário acaba; o "já usou" da Ordem Recusada vale para a luta inteira. */
export function resetSupremeForRound(f: Fighter) {
  const st = f.supreme;
  if (!st) return;
  st.stacks = 0;
  st.idleMs = 0;
  st.activeMs = 0;
  endOrdem(f);
}

/** Texto curto do estado atual para a interface da luta (ex.: "COMBO 3/5"), ou null. */
export function supremeHudStacks(f: Fighter): { current: number; max: number } | null {
  if (f.supremeId !== 'trofeu_revanche' || !f.supreme) return null;
  return { current: f.supreme.stacks, max: TROFEU_MAX_STACKS };
}
