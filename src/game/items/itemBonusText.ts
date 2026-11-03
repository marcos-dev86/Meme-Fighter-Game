import { getLang } from '@/game/i18n/i18n';
import type { Lang } from '@/game/i18n/translations';
import { ITEMS } from './itemDefs';
import { GEAR } from './gearDefs';
import { attackLabel, statusLabel } from './skillText';
import { bonusPct, rarityBonus, reductionPct, scaledEnergy, scaledHeal } from './rarity';

/**
 * Linhas de descrição dos BÔNUS DE RARIDADE de um item, nos 5 idiomas. Os números
 * saem da MESMA tabela que o combate usa (rarity.ts / gearDefs.ts), então o texto
 * nunca diverge do que o jogo realmente aplica. Itens comuns não têm bônus (lista vazia).
 * A tela pinta cada linha com a cor da raridade do item (RARITY_COLOR).
 */
const LANGS: Lang[] = ['pt', 'en', 'es', 'fr', 'ja'];
type Five = [string, string, string, string, string];
const pick = (v: Five, lang: Lang): string => v[LANGS.indexOf(lang)];

// {p} porcentagem, {b} valor base, {n} valor final, {on} golpes, {st} status, {s} segundos
const TPL: Record<'damage' | 'guard' | 'heal' | 'energy' | 'proc', Five> = {
  damage: ['+{p}% de dano pela raridade.', '+{p}% damage from rarity.', '+{p}% de daño por rareza.', '+{p} % de dégâts grâce à la rareté.', 'レア度でダメージ+{p}%。'],
  guard: ['Recebe {p}% menos dano pela raridade.', 'Take {p}% less damage from rarity.', 'Recibes {p}% menos daño por rareza.', 'Subit {p} % de dégâts en moins grâce à la rareté.', 'レア度で受けるダメージ-{p}%。'],
  heal: ['+{p}% de cura pela raridade ({b} → {n}).', '+{p}% healing from rarity ({b} → {n}).', '+{p}% de curación por rareza ({b} → {n}).', '+{p} % de soin grâce à la rareté ({b} → {n}).', 'レア度で回復+{p}%（{b}→{n}）。'],
  energy: ['+{p}% de energia pela raridade ({b} → {n}).', '+{p}% energy from rarity ({b} → {n}).', '+{p}% de energía por rareza ({b} → {n}).', '+{p} % d’énergie grâce à la rareté ({b} → {n}).', 'レア度でエネルギー+{p}%（{b}→{n}）。'],
  proc: ['{on}: {p}% de chance de causar {st} ({s} s) pela raridade.', '{on}: {p}% chance to inflict {st} ({s} s) from rarity.', '{on}: {p}% de probabilidad de causar {st} ({s} s) por rareza.', '{on} : {p} % de chance d’infliger {st} ({s} s) grâce à la rareté.', '{on}：レア度で{p}%の確率で{st}（{s}秒）。'],
};
const AND: Five = [' e ', ' and ', ' y ', ' et ', '・'];

function fill(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k]));
}

/** Linhas de bônus de raridade do item `id` (vazio se o item for comum, desconhecido ou sem bônus aplicável). */
export function itemBonusLines(id: string, lang: Lang = getLang()): string[] {
  const d = ITEMS[id];
  if (!d) return [];
  const b = rarityBonus(d.rarity);
  const T = (k: keyof typeof TPL, vars: Record<string, string | number>) => fill(pick(TPL[k], lang), vars);
  const out: string[] = [];
  const g = GEAR[id];

  if (g?.kind === 'weapon') {
    if (b.weaponDamage > 1) out.push(T('damage', { p: bonusPct(b.weaponDamage) }));
    if (g.proc && b.procChance > 0) {
      out.push(
        T('proc', {
          on: g.proc.on.map((a) => attackLabel(a, lang)).join(pick(AND, lang)),
          p: Math.round(b.procChance * 100),
          st: statusLabel(g.proc.kind, lang),
          s: String(Math.round(g.proc.ms / 100) / 10),
        }),
      );
    }
    return out;
  }
  if (g?.kind === 'shield') {
    if (b.guard < 1) out.push(T('guard', { p: reductionPct(b.guard) }));
    return out;
  }

  // Consumíveis: só cura e energia têm bônus de raridade.
  for (const e of d.effects) {
    if (e.kind === 'heal' && b.heal > 1) {
      out.push(T('heal', { p: bonusPct(b.heal), b: e.amount, n: scaledHeal(e.amount, d.rarity) }));
    } else if (e.kind === 'energy' && b.energy > 1) {
      out.push(T('energy', { p: bonusPct(b.energy), b: e.amount, n: scaledEnergy(e.amount, d.rarity) }));
    }
  }
  return out;
}
