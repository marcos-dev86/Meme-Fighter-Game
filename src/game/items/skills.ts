import type { AttackType, Fighter, StatusKind } from '@/game/battle/Fighter';
import type { IconName } from '@/game/ui/iconRegistry';
import { attachSupreme } from '@/game/battle/supremes';
import { GADIGAGO_TREE, ORC_TREE } from './skillTreesCampanhas';

/**
 * Árvore de habilidades, uma por personagem jogável (Parte 36), paga com os
 * mesmos PONTOS DE STATUS dos atributos. Cada árvore tem 29 habilidades:
 *  - 5 ramos (A..E) de 5 habilidades em fila (custos 1, 1, 2, 2, 3 = 9 pontos por ramo);
 *  - uma linha final de 4: as 3 primeiras exigem o FIM de dois ramos (5 pontos cada)
 *    e a última exige as outras três (8 pontos).
 * Total: 45 + 23 = 68 pontos por árvore.
 */
export type SkillEffect =
  | { t: 'proc'; kind: StatusKind; chance: number; ms: number; on: AttackType[] }
  | { t: 'dmg'; mult: number } // todos os golpes
  | { t: 'flashdmg'; mult: number } // só FLASH
  | { t: 'strongdmg'; mult: number } // só FORTE
  | { t: 'ultdmg'; mult: number } // só SUPER
  | { t: 'taken'; mult: number }
  | { t: 'health'; add: number }
  | { t: 'speed'; mult: number }
  | { t: 'shieldCost'; mult: number }
  | { t: 'energyGain'; mult: number }
  | { t: 'dashCd'; mult: number }
  | { t: 'statusChance'; mult: number }
  | { t: 'resist'; mult: number }
  | { t: 'regen'; perSec: number }
  | { t: 'crit'; chance: number; mult?: number } // chance soma; mult (opcional) soma ao dano crítico (base 1,5x)
  | { t: 'lifesteal'; pct: number } // fração do dano que volta como vida (0.05 = 5%)
  | { t: 'statusDmg'; mult: number } // dano extra contra alvo com status
  | { t: 'startEnergy'; add: number } // energia inicial de cada round
  | { t: 'supreme'; id: string }; // suprema exclusiva do personagem (battle/supremes.ts)

export const BRANCH_COUNT = 5;
export const BRANCH_COSTS = [1, 1, 2, 2, 3] as const;
export const FINAL_COSTS = [5, 5, 5, 8] as const;

export interface SkillDef {
  id: string;
  icon: IconName;
  cost: number;
  /** 0..4 = ramos A..E; 5 = linha final. */
  branch: number;
  /** Posição dentro do ramo (1..5) ou da linha final (1..4). */
  tier: number;
  requires: string[];
  effects: SkillEffect[];
  /** Nível mínimo do jogador para aprender (opcional; as árvores individuais usam). */
  minLevel?: number;
  /** Suprema exclusiva do personagem (destaque na tela). */
  supreme?: boolean;
}

export interface SkillTree {
  character: string;
  skills: SkillDef[];
  /** Número de ramos (colunas) antes da linha final; ausente = 5. */
  branches?: number;
}

type Row = { icon: IconName; effects: SkillEffect[] };

/** Monta uma árvore: 5 ramos de 5 `Row` e 4 linhas finais com os ramos que cada uma exige. */
function buildTree(character: string, prefix: string, branches: Row[][], finals: { icon: IconName; needs: [number, number]; effects: SkillEffect[] }[]): SkillTree {
  const skills: SkillDef[] = [];
  const letters = ['a', 'b', 'c', 'd', 'e'];
  branches.forEach((rows, b) => {
    rows.forEach((r, i) => {
      skills.push({
        id: `${prefix}_${letters[b]}${i + 1}`,
        icon: r.icon,
        cost: BRANCH_COSTS[i],
        branch: b,
        tier: i + 1,
        requires: i === 0 ? [] : [`${prefix}_${letters[b]}${i}`],
        effects: r.effects,
      });
    });
  });
  finals.forEach((f, i) => {
    const last = i === 3;
    skills.push({
      id: `${prefix}_f${i + 1}`,
      icon: f.icon,
      cost: FINAL_COSTS[i],
      branch: 5,
      tier: i + 1,
      requires: last ? [`${prefix}_f1`, `${prefix}_f2`, `${prefix}_f3`] : [`${prefix}_${letters[f.needs[0]]}5`, `${prefix}_${letters[f.needs[1]]}5`],
      effects: f.effects,
    });
  });
  return { character, skills };
}

/** DOGGE: A Brasa (fogo) · B Guardião (defesa) · C Feroz (dano e crítico) · D Fôlego (energia e velocidade) · E Presa (roubo de vida e status). */
const DOGGE = buildTree(
  'dogge',
  'd',
  [
    [
      { icon: 'fire', effects: [{ t: 'proc', kind: 'burn', chance: 0.25, ms: 3500, on: ['flash'] }] },
      { icon: 'fire', effects: [{ t: 'proc', kind: 'burn', chance: 0.4, ms: 4000, on: ['strong'] }] },
      { icon: 'sparkle', effects: [{ t: 'statusDmg', mult: 1.12 }] },
      { icon: 'fire', effects: [{ t: 'statusChance', mult: 1.15 }, { t: 'proc', kind: 'burn', chance: 0.15, ms: 5000, on: ['flash', 'strong'] }] },
      { icon: 'fire', effects: [{ t: 'proc', kind: 'burn', chance: 1, ms: 6000, on: ['ultimate'] }, { t: 'ultdmg', mult: 1.2 }] },
    ],
    [
      { icon: 'tower', effects: [{ t: 'taken', mult: 0.94 }] },
      { icon: 'bolt', effects: [{ t: 'energyGain', mult: 1.2 }] },
      { icon: 'tower', effects: [{ t: 'shieldCost', mult: 0.75 }, { t: 'resist', mult: 0.8 }] },
      { icon: 'heart', effects: [{ t: 'health', add: 25 }] },
      { icon: 'tower', effects: [{ t: 'taken', mult: 0.9 }, { t: 'regen', perSec: 0.4 }] },
    ],
    [
      { icon: 'fist', effects: [{ t: 'strongdmg', mult: 1.1 }] },
      { icon: 'target', effects: [{ t: 'crit', chance: 0.08 }] },
      { icon: 'swords', effects: [{ t: 'flashdmg', mult: 1.15 }] },
      { icon: 'target', effects: [{ t: 'crit', chance: 0.1 }] },
      { icon: 'skull', effects: [{ t: 'dmg', mult: 1.1 }, { t: 'crit', chance: 0, mult: 0.25 }] },
    ],
    [
      { icon: 'wind', effects: [{ t: 'speed', mult: 1.05 }] },
      { icon: 'bolt', effects: [{ t: 'startEnergy', add: 20 }] },
      { icon: 'wind', effects: [{ t: 'dashCd', mult: 0.75 }] },
      { icon: 'wind', effects: [{ t: 'speed', mult: 1.06 }, { t: 'energyGain', mult: 1.15 }] },
      { icon: 'star', effects: [{ t: 'startEnergy', add: 30 }, { t: 'energyGain', mult: 1.2 }] },
    ],
    [
      { icon: 'heart', effects: [{ t: 'lifesteal', pct: 0.04 }] },
      { icon: 'poison', effects: [{ t: 'statusChance', mult: 1.15 }] },
      { icon: 'skull', effects: [{ t: 'statusDmg', mult: 1.12 }] },
      { icon: 'heart', effects: [{ t: 'lifesteal', pct: 0.04 }] },
      { icon: 'skull', effects: [{ t: 'lifesteal', pct: 0.05 }, { t: 'regen', perSec: 0.3 }] },
    ],
  ],
  [
    { icon: 'fire', needs: [0, 1], effects: [{ t: 'dmg', mult: 1.08 }, { t: 'taken', mult: 0.92 }, { t: 'proc', kind: 'burn', chance: 0.25, ms: 4000, on: ['strong'] }] },
    { icon: 'swords', needs: [2, 3], effects: [{ t: 'crit', chance: 0.1 }, { t: 'speed', mult: 1.06 }, { t: 'dmg', mult: 1.08 }] },
    { icon: 'skull', needs: [4, 0], effects: [{ t: 'lifesteal', pct: 0.06 }, { t: 'statusDmg', mult: 1.15 }, { t: 'proc', kind: 'burn', chance: 0.15, ms: 4000, on: ['flash'] }] },
    { icon: 'crown', needs: [0, 0], effects: [{ t: 'dmg', mult: 1.15 }, { t: 'health', add: 40 }, { t: 'regen', perSec: 0.8 }, { t: 'startEnergy', add: 30 }, { t: 'crit', chance: 0.05 }] },
  ],
);


/** Árvores individuais já entregues; quem ainda não tem a sua usa a do Dogge (treeFor) até a campanha chegar. */
export const SKILL_TREES: Record<string, SkillTree> = { dogge: DOGGE, gadigago: GADIGAGO_TREE, orc: ORC_TREE };

/** Quantos ramos (colunas) a árvore tem: 5 nas árvores originais, 4 nas individuais das campanhas. */
export function treeBranchCount(tree: SkillTree): number {
  return tree.branches ?? BRANCH_COUNT;
}

/** Custos das habilidades antigas da árvore de Gelo/Sombra do Gadigago (removida): quem tiver id velho no save recebe os pontos de volta. */
const OLD_GADIGAGO_BRANCH_COSTS = [1, 1, 2, 2, 3];
export function legacySkillCost(id: string): number {
  const m = /^g_([a-e])([1-5])$/.exec(id);
  if (m) return OLD_GADIGAGO_BRANCH_COSTS[Number(m[2]) - 1];
  if (/^g_f[1-4]$/.test(id)) return id === 'g_f4' ? 8 : 5;
  return 0;
}

export function treeFor(characterId: string): SkillTree {
  return SKILL_TREES[characterId] ?? DOGGE;
}

export function skillById(characterId: string, id: string): SkillDef | undefined {
  return treeFor(characterId).skills.find((s) => s.id === id);
}

export function totalSkillCost(characterId: string): number {
  return treeFor(characterId).skills.reduce((a, s) => a + s.cost, 0);
}

/** Aplica as habilidades aprendidas num Fighter (uma vez, no começo de uma luta / sessão do mundo). */
export function applySkills(fighter: Fighter, characterId: string, learned: string[]) {
  const tree = treeFor(characterId);
  for (const sk of tree.skills) {
    if (!learned.includes(sk.id)) continue;
    for (const e of sk.effects) {
      switch (e.t) {
        case 'proc':
          fighter.onHitStatus.push({ kind: e.kind, chance: e.chance, ms: e.ms, on: e.on });
          break;
        case 'dmg':
          fighter.flashDamage *= e.mult;
          fighter.strongDamage *= e.mult;
          fighter.ultimateDamage *= e.mult;
          break;
        case 'flashdmg':
          fighter.flashDamage *= e.mult;
          break;
        case 'strongdmg':
          fighter.strongDamage *= e.mult;
          break;
        case 'ultdmg':
          fighter.ultimateDamage *= e.mult;
          break;
        case 'taken':
          fighter.damageTakenMult *= e.mult;
          break;
        case 'health':
          fighter.maxHealth += e.add;
          fighter.health = fighter.maxHealth;
          break;
        case 'speed':
          fighter.speed *= e.mult;
          fighter.dashSpeed *= e.mult;
          break;
        case 'shieldCost':
          fighter.shieldCost *= e.mult;
          break;
        case 'energyGain':
          fighter.energyGainMult *= e.mult;
          break;
        case 'dashCd':
          fighter.dashCooldown *= e.mult;
          break;
        case 'statusChance':
          fighter.statusChanceMult *= e.mult;
          break;
        case 'resist':
          fighter.statusDurationMult *= e.mult;
          break;
        case 'regen':
          fighter.regenPerSec += e.perSec;
          break;
        case 'crit':
          fighter.critChance = Math.min(0.9, fighter.critChance + e.chance);
          if (e.mult) fighter.critMult += e.mult;
          break;
        case 'lifesteal':
          fighter.lifesteal += e.pct;
          break;
        case 'statusDmg':
          fighter.statusTargetDmgMult *= e.mult;
          break;
        case 'startEnergy':
          fighter.startEnergy = Math.min(fighter.maxEnergy, fighter.startEnergy + e.add);
          break;
        case 'supreme':
          attachSupreme(fighter, e.id); // idempotente: guarda o id no lutador, não soma nada
          break;
      }
    }
  }
  fighter.energy = Math.min(fighter.maxEnergy, fighter.startEnergy);
}
