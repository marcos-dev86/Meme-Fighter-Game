import type { IconName } from '@/game/ui/iconRegistry';
import type { SkillDef, SkillEffect, SkillTree } from './skills';

/**
 * Árvores INDIVIDUAIS das campanhas (uma por personagem, nada de reaproveitar a do Dogge). Cada árvore tem 5 camadas:
 *  1. Fundamentos        (tier 1 de cada ramo, nível 1, 1 ponto)
 *  2. Especialização     (tier 2 de cada ramo, nível 3, 2 pontos)
 *  3. Técnicas avançadas (tier 3 de cada ramo, nível 5, 3 pontos)
 *  4. Poderes especiais  (3 nós da linha final: cada um exige o FIM de dois ramos vizinhos, nível 7, 5 pontos)
 *  5. Suprema exclusiva  (último nó: exige os 3 poderes especiais, nível 10, 8 pontos; o efeito é uma suprema do
 *     battle/supremes.ts que só existe para aquele personagem)
 * 4 ramos x (1+2+3) + 15 + 8 = 47 pontos por árvore. Ids novos (prefixo próprio) para nunca colidir com saves de outros.
 */
export const CUSTOM_BRANCH_COSTS = [1, 2, 3] as const;
export const CUSTOM_BRANCH_LEVELS = [1, 3, 5] as const;
export const CUSTOM_POWER_COST = 5;
export const CUSTOM_POWER_LEVEL = 7;
export const CUSTOM_SUPREME_COST = 8;
export const CUSTOM_SUPREME_LEVEL = 10;

type Row = { icon: IconName; effects: SkillEffect[] };
interface Spec {
  character: string;
  prefix: string;
  /** 4 ramos de 3 linhas. */
  branches: Row[][];
  /** 3 poderes especiais; `needs` = índices dos dois ramos (0..3) que precisam estar completos. */
  powers: { icon: IconName; needs: [number, number]; effects: SkillEffect[] }[];
  supreme: { icon: IconName; id: string };
}

function buildCustomTree(spec: Spec): SkillTree {
  const skills: SkillDef[] = [];
  const letters = ['a', 'b', 'c', 'd'];
  spec.branches.forEach((rows, b) => {
    rows.forEach((r, i) => {
      skills.push({
        id: `${spec.prefix}_${letters[b]}${i + 1}`,
        icon: r.icon,
        cost: CUSTOM_BRANCH_COSTS[i],
        branch: b,
        tier: i + 1,
        requires: i === 0 ? [] : [`${spec.prefix}_${letters[b]}${i}`],
        effects: r.effects,
        minLevel: CUSTOM_BRANCH_LEVELS[i],
      });
    });
  });
  spec.powers.forEach((p, i) => {
    skills.push({
      id: `${spec.prefix}_f${i + 1}`,
      icon: p.icon,
      cost: CUSTOM_POWER_COST,
      branch: 5,
      tier: i + 1,
      requires: [`${spec.prefix}_${letters[p.needs[0]]}3`, `${spec.prefix}_${letters[p.needs[1]]}3`],
      effects: p.effects,
      minLevel: CUSTOM_POWER_LEVEL,
    });
  });
  skills.push({
    id: `${spec.prefix}_f4`,
    icon: spec.supreme.icon,
    cost: CUSTOM_SUPREME_COST,
    branch: 5,
    tier: 4,
    requires: [`${spec.prefix}_f1`, `${spec.prefix}_f2`, `${spec.prefix}_f3`],
    effects: [{ t: 'supreme', id: spec.supreme.id }],
    minLevel: CUSTOM_SUPREME_LEVEL,
    supreme: true,
  });
  return { character: spec.character, skills, branches: 4 };
}

/** GADIGAGO, Precisão, críticos e combos: A Mira (crítico) · B Combo (golpes e energia) · C Ritmo (velocidade e esquiva) · D Orgulho (resistência de quem não desiste). */
export const GADIGAGO_TREE = buildCustomTree({
  character: 'gadigago',
  prefix: 'gd',
  branches: [
    [
      { icon: 'ab_crosshair', effects: [{ t: 'crit', chance: 0.06 }] },
      { icon: 'target', effects: [{ t: 'crit', chance: 0.08 }, { t: 'strongdmg', mult: 1.08 }] },
      { icon: 'ab_soco_certeiro', effects: [{ t: 'crit', chance: 0.05, mult: 0.35 }] },
    ],
    [
      { icon: 'fist', effects: [{ t: 'flashdmg', mult: 1.1 }] },
      { icon: 'ab_combo', effects: [{ t: 'flashdmg', mult: 1.1 }, { t: 'energyGain', mult: 1.15 }] },
      { icon: 'swords', effects: [{ t: 'strongdmg', mult: 1.15 }, { t: 'proc', kind: 'stun', chance: 0.12, ms: 700, on: ['strong'] }] },
    ],
    [
      { icon: 'wind', effects: [{ t: 'speed', mult: 1.05 }] },
      { icon: 'ab_pe_madrugada', effects: [{ t: 'dashCd', mult: 0.8 }] },
      { icon: 'tower', effects: [{ t: 'speed', mult: 1.05 }, { t: 'shieldCost', mult: 0.8 }] },
    ],
    [
      { icon: 'ab_notebook', effects: [{ t: 'health', add: 15 }] },
      { icon: 'heart', effects: [{ t: 'taken', mult: 0.94 }, { t: 'startEnergy', add: 15 }] },
      { icon: 'star', effects: [{ t: 'regen', perSec: 0.3 }, { t: 'resist', mult: 0.85 }] },
    ],
  ],
  powers: [
    { icon: 'skull', needs: [0, 1], effects: [{ t: 'crit', chance: 0.08, mult: 0.2 }, { t: 'dmg', mult: 1.06 }] },
    { icon: 'bolt', needs: [1, 2], effects: [{ t: 'flashdmg', mult: 1.1 }, { t: 'speed', mult: 1.06 }, { t: 'energyGain', mult: 1.2 }] },
    { icon: 'ab_fury', needs: [2, 3], effects: [{ t: 'lifesteal', pct: 0.04 }, { t: 'taken', mult: 0.92 }, { t: 'startEnergy', add: 20 }] },
  ],
  supreme: { icon: 'ab_sup_trofeu_revanche', id: 'trofeu_revanche' },
});

/** ORC, Força bruta e resistência: A Força (golpes pesados) · B Couraça (defesa) · C Vigor (vida e regeneração) · D Teimosia (energia e marcha). */
export const ORC_TREE = buildCustomTree({
  character: 'orc',
  prefix: 'oc',
  branches: [
    [
      { icon: 'fist', effects: [{ t: 'strongdmg', mult: 1.1 }] },
      { icon: 'ab_club', effects: [{ t: 'dmg', mult: 1.06 }, { t: 'proc', kind: 'stun', chance: 0.15, ms: 700, on: ['strong'] }] },
      { icon: 'skull', effects: [{ t: 'strongdmg', mult: 1.15 }, { t: 'ultdmg', mult: 1.12 }] },
    ],
    [
      { icon: 'tower', effects: [{ t: 'taken', mult: 0.95 }] },
      { icon: 'ab_pot', effects: [{ t: 'shieldCost', mult: 0.7 }, { t: 'taken', mult: 0.97 }] },
      { icon: 'ab_casca_grossa', effects: [{ t: 'taken', mult: 0.92 }, { t: 'resist', mult: 0.8 }] },
    ],
    [
      { icon: 'ab_soup', effects: [{ t: 'health', add: 25 }] },
      { icon: 'heart', effects: [{ t: 'regen', perSec: 0.35 }] },
      { icon: 'heart', effects: [{ t: 'health', add: 30 }, { t: 'regen', perSec: 0.35 }] },
    ],
    [
      { icon: 'bolt', effects: [{ t: 'startEnergy', add: 15 }] },
      { icon: 'moon', effects: [{ t: 'energyGain', mult: 1.2 }] },
      { icon: 'ab_boot_march', effects: [{ t: 'energyGain', mult: 1.15 }, { t: 'startEnergy', add: 15 }, { t: 'speed', mult: 1.04 }] },
    ],
  ],
  powers: [
    { icon: 'swords', needs: [0, 1], effects: [{ t: 'strongdmg', mult: 1.12 }, { t: 'dmg', mult: 1.05 }, { t: 'proc', kind: 'stun', chance: 0.2, ms: 800, on: ['strong'] }] },
    { icon: 'ab_pot', needs: [1, 2], effects: [{ t: 'taken', mult: 0.9 }, { t: 'health', add: 30 }] },
    { icon: 'ab_fury', needs: [2, 3], effects: [{ t: 'regen', perSec: 0.5 }, { t: 'lifesteal', pct: 0.04 }, { t: 'startEnergy', add: 20 }] },
  ],
  supreme: { icon: 'ab_sup_ordem_recusada', id: 'ordem_recusada' },
});
