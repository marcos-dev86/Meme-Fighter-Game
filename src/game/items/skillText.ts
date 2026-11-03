import { getLang } from '@/game/i18n/i18n';
import type { Lang } from '@/game/i18n/translations';
import type { AttackType, StatusKind } from '@/game/battle/Fighter';
import type { SkillDef, SkillEffect } from './skills';

/** Nomes, ramos e descrições da árvore de habilidades nos 5 idiomas. As descrições são montadas a partir dos efeitos. */
const LANGS: Lang[] = ['pt', 'en', 'es', 'fr', 'ja'];
type Five = [string, string, string, string, string];
const pick = (v: Five, lang: Lang): string => v[LANGS.indexOf(lang)];

const NAMES: Record<string, Five> = {
  d_a1: ['Mordida Quente', 'Hot Bite', 'Mordida Ardiente', 'Morsure Brûlante', '熱い噛みつき'],
  d_a2: ['Pelagem em Chamas', 'Blazing Fur', 'Pelaje en Llamas', 'Pelage Enflammé', '燃える毛並み'],
  d_a3: ['Combustão', 'Combustion', 'Combustión', 'Combustion', '燃焼'],
  d_a4: ['Fogo Persistente', 'Lingering Fire', 'Fuego Persistente', 'Feu Tenace', 'しつこい炎'],
  d_a5: ['Super Inferno', 'Super Inferno', 'Súper Infierno', 'Super Enfer', 'スーパー業火'],
  d_b1: ['Pele Grossa', 'Thick Skin', 'Piel Gruesa', 'Peau Épaisse', '厚い皮'],
  d_b2: ['Fôlego de Cão', "Dog's Breath", 'Aliento de Perro', 'Souffle de Chien', '犬の息吹'],
  d_b3: ['Muralha', 'Bulwark', 'Muralla', 'Muraille', '防壁'],
  d_b4: ['Coração Grande', 'Big Heart', 'Gran Corazón', 'Grand Cœur', '大きな心臓'],
  d_b5: ['Casca Dura', 'Hard Shell', 'Caparazón Duro', 'Carapace Dure', '堅い殻'],
  d_c1: ['Garra Afiada', 'Sharp Claw', 'Garra Afilada', 'Griffe Aiguisée', '鋭い爪'],
  d_c2: ['Olho de Caçador', "Hunter's Eye", 'Ojo de Cazador', 'Œil de Chasseur', 'ハンターの目'],
  d_c3: ['Dentada Rápida', 'Quick Bite', 'Mordisco Rápido', 'Morsure Rapide', '素早い噛みつき'],
  d_c4: ['Instinto Assassino', 'Killer Instinct', 'Instinto Asesino', 'Instinct Tueur', '殺しの本能'],
  d_c5: ['Fúria Selvagem', 'Wild Fury', 'Furia Salvaje', 'Fureur Sauvage', '野生の怒り'],
  d_d1: ['Patas Leves', 'Light Paws', 'Patas Ligeras', 'Pattes Légères', '軽い足'],
  d_d2: ['Carga Inicial', 'Opening Charge', 'Carga Inicial', 'Charge Initiale', '初期チャージ'],
  d_d3: ['Dash Rápido', 'Quick Dash', 'Dash Rápido', 'Dash Rapide', '高速ダッシュ'],
  d_d4: ['Disparada', 'Sprint', 'Disparada', 'Sprint', '全力疾走'],
  d_d5: ['Aura da Matilha', 'Pack Aura', 'Aura de la Manada', 'Aura de la Meute', '群れのオーラ'],
  d_e1: ['Gosto de Sangue', 'Taste of Blood', 'Sabor a Sangre', 'Goût du Sang', '血の味'],
  d_e2: ['Rosnado', 'Growl', 'Gruñido', 'Grognement', 'うなり声'],
  d_e3: ['Caçador de Feridos', 'Wound Hunter', 'Cazador de Heridos', 'Chasseur de Blessés', '傷を狩る者'],
  d_e4: ['Sede de Sangue', 'Bloodthirst', 'Sed de Sangre', 'Soif de Sang', '血への渇き'],
  d_e5: ['Fome Voraz', 'Ravenous Hunger', 'Hambre Voraz', 'Faim Vorace', '貪欲な飢え'],
  d_f1: ['Muralha de Fogo', 'Wall of Fire', 'Muralla de Fuego', 'Mur de Feu', '炎の壁'],
  d_f2: ['Predador Supremo', 'Apex Predator', 'Depredador Supremo', 'Prédateur Suprême', '頂点捕食者'],
  d_f3: ['Cão do Inferno', 'Hellhound', 'Perro del Infierno', "Chien d'Enfer", '地獄の犬'],
  d_f4: ['Rei da Matilha', 'Pack King', 'Rey de la Manada', 'Roi de la Meute', '群れの王'],
  g_a1: ['Toque Gelado', 'Frozen Touch', 'Toque Helado', 'Toucher Glacé', '凍てつく一撃'],
  g_a2: ['Rajada Polar', 'Polar Gust', 'Ráfaga Polar', 'Rafale Polaire', '極地の突風'],
  g_a3: ['Frio Cortante', 'Biting Cold', 'Frío Cortante', 'Froid Mordant', '刺す寒さ'],
  g_a4: ['Nevasca', 'Snowstorm', 'Ventisca', 'Tempête de Neige', '吹雪'],
  g_a5: ['Zero Absoluto', 'Absolute Zero', 'Cero Absoluto', 'Zéro Absolu', '絶対零度'],
  g_b1: ['Pés Leves', 'Light Feet', 'Pies Ligeros', 'Pieds Légers', '軽い足取り'],
  g_b2: ['Dash Rápido', 'Quick Dash', 'Dash Rápido', 'Dash Rapide', '高速ダッシュ'],
  g_b3: ['Esquiva Fluida', 'Fluid Dodge', 'Esquiva Fluida', 'Esquive Fluide', '流れる回避'],
  g_b4: ['Passo Sombrio', 'Shadow Step', 'Paso Sombrío', "Pas d'Ombre", '影の足運び'],
  g_b5: ['Vento Cortante', 'Cutting Wind', 'Viento Cortante', 'Vent Tranchant', '切り裂く風'],
  g_c1: ['Gota Amarga', 'Bitter Drop', 'Gota Amarga', 'Goutte Amère', '苦い一滴'],
  g_c2: ['Veneno Sombrio', 'Dark Venom', 'Veneno Sombrío', 'Venin Sombre', '暗黒の毒'],
  g_c3: ['Toxina Forte', 'Strong Toxin', 'Toxina Fuerte', 'Toxine Puissante', '強力な毒素'],
  g_c4: ['Névoa Tóxica', 'Toxic Mist', 'Niebla Tóxica', 'Brume Toxique', '毒霧'],
  g_c5: ['Peçonha Letal', 'Lethal Venom', 'Ponzoña Letal', 'Venin Mortel', '致死の毒'],
  g_d1: ['Olhar Frio', 'Cold Stare', 'Mirada Fría', 'Regard Froid', '冷たい眼差し'],
  g_d2: ['Golpe Furtivo', 'Sneak Strike', 'Golpe Furtivo', 'Coup Furtif', '不意打ち'],
  g_d3: ['Ponto Cego', 'Blind Spot', 'Punto Ciego', 'Angle Mort', '死角'],
  g_d4: ['Lâmina Sombria', 'Shadow Blade', 'Hoja Sombría', "Lame d'Ombre", '影の刃'],
  g_d5: ['Assassino', 'Assassin', 'Asesino', 'Assassin', '暗殺者'],
  g_e1: ['Mente Calma', 'Calm Mind', 'Mente Serena', 'Esprit Calme', '静かな心'],
  g_e2: ['Vigor', 'Vigor', 'Vigor', 'Vigueur', '活力'],
  g_e3: ['Sede de Sombras', 'Thirst for Shadows', 'Sed de Sombras', "Soif d'Ombres", '影への渇望'],
  g_e4: ['Foco', 'Focus', 'Concentración', 'Concentration', '集中'],
  g_e5: ['Eclipse', 'Eclipse', 'Eclipse', 'Éclipse', '日食'],
  g_f1: ['Gelo Veloz', 'Swift Frost', 'Escarcha Veloz', 'Givre Rapide', '迅速な霜'],
  g_f2: ['Sombra Venenosa', 'Venomous Shadow', 'Sombra Venenosa', 'Ombre Venimeuse', '毒の影'],
  g_f3: ['Dança da Lua', 'Moon Dance', 'Danza de la Luna', 'Danse de la Lune', '月の舞'],
  g_f4: ['Lenda da Sombra', 'Shadow Legend', 'Leyenda de la Sombra', "Légende de l'Ombre", '影の伝説'],
};

const BRANCHES: Record<string, Five[]> = {
  dogge: [
    ['BRASA', 'EMBER', 'BRASA', 'BRAISE', '残り火'],
    ['GUARDIÃO', 'GUARDIAN', 'GUARDIÁN', 'GARDIEN', '守護'],
    ['FEROZ', 'FIERCE', 'FEROZ', 'FÉROCE', '猛獣'],
    ['FÔLEGO', 'STAMINA', 'ALIENTO', 'SOUFFLE', 'スタミナ'],
    ['PRESA', 'FANG', 'COLMILLO', 'CROC', '牙'],
    ['LENDA', 'LEGEND', 'LEYENDA', 'LÉGENDE', '伝説'],
  ],
  gadigago: [
    ['GELO', 'ICE', 'HIELO', 'GLACE', '氷'],
    ['ÁGIL', 'AGILE', 'ÁGIL', 'AGILE', '俊敏'],
    ['VENENO', 'VENOM', 'VENENO', 'VENIN', '毒'],
    ['SOMBRA', 'SHADOW', 'SOMBRA', 'OMBRE', '影'],
    ['VIGOR', 'VIGOR', 'VIGOR', 'VIGUEUR', '活力'],
    ['LENDA', 'LEGEND', 'LEYENDA', 'LÉGENDE', '伝説'],
  ],
};

const ON: Record<'flash' | 'strong' | 'ultimate', Five> = {
  flash: ['FLASH', 'FLASH', 'FLASH', 'FLASH', 'フラッシュ'],
  strong: ['FORTE', 'STRONG', 'FUERTE', 'FORT', '強攻撃'],
  ultimate: ['SUPER', 'SUPER', 'SUPER', 'SUPER', '必殺技'],
};
const AND: Five = [' e ', ' and ', ' y ', ' et ', '・'];
const STATUS: Record<'burn' | 'freeze' | 'poison' | 'stun', Five> = {
  burn: ['Queimadura', 'Burn', 'Quemadura', 'Brûlure', '火傷'],
  freeze: ['Congelamento', 'Freeze', 'Congelación', 'Gel', '凍結'],
  poison: ['Veneno', 'Poison', 'Veneno', 'Poison', '毒'],
  stun: ['Atordoamento', 'Stun', 'Aturdimiento', 'Étourdissement', '気絶'],
};

// {p} porcentagem, {n} número, {on} golpes, {st} status, {s} segundos, {m} dano crítico extra
const TPL: Record<string, Five> = {
  proc: ['{on}: {p}% de chance de causar {st} ({s} s).', '{on}: {p}% chance to inflict {st} ({s} s).', '{on}: {p}% de probabilidad de causar {st} ({s} s).', '{on} : {p} % de chance d’infliger {st} ({s} s).', '{on}：{p}%の確率で{st}（{s}秒）。'],
  procAlways: ['{on}: sempre causa {st} ({s} s).', '{on}: always inflicts {st} ({s} s).', '{on}: siempre causa {st} ({s} s).', '{on} : inflige toujours {st} ({s} s).', '{on}：必ず{st}（{s}秒）。'],
  dmg: ['+{p}% de dano em todos os golpes.', '+{p}% damage on all attacks.', '+{p}% de daño en todos los golpes.', '+{p} % de dégâts sur tous les coups.', '全ての攻撃のダメージ+{p}%。'],
  flashdmg: ['+{p}% de dano no FLASH.', '+{p}% damage on FLASH.', '+{p}% de daño en FLASH.', '+{p} % de dégâts sur FLASH.', 'フラッシュのダメージ+{p}%。'],
  strongdmg: ['+{p}% de dano no FORTE.', '+{p}% damage on STRONG.', '+{p}% de daño en FUERTE.', '+{p} % de dégâts sur FORT.', '強攻撃のダメージ+{p}%。'],
  ultdmg: ['+{p}% de dano no SUPER.', '+{p}% damage on SUPER.', '+{p}% de daño en SUPER.', '+{p} % de dégâts sur SUPER.', '必殺技のダメージ+{p}%。'],
  taken: ['Recebe {p}% menos dano.', 'Take {p}% less damage.', 'Recibes {p}% menos daño.', 'Subit {p} % de dégâts en moins.', '受けるダメージ-{p}%。'],
  health: ['+{n} de vida máxima.', '+{n} max health.', '+{n} de vida máxima.', '+{n} de vie max.', '最大HP+{n}。'],
  speed: ['+{p}% de velocidade.', '+{p}% speed.', '+{p}% de velocidad.', '+{p} % de vitesse.', '速度+{p}%。'],
  shieldCost: ['O escudo gasta {p}% menos energia.', 'Shield costs {p}% less energy.', 'El escudo gasta {p}% menos energía.', 'Le bouclier coûte {p} % d’énergie en moins.', 'シールドの消費エネルギー-{p}%。'],
  energyGain: ['+{p}% de energia ao acertar golpes.', '+{p}% energy gained when hitting.', '+{p}% de energía al acertar golpes.', '+{p} % d’énergie en frappant.', '攻撃時のエネルギー獲得+{p}%。'],
  dashCd: ['A recarga do dash cai {p}%.', 'Dash cooldown reduced by {p}%.', 'La recarga del dash baja un {p}%.', 'Le délai du dash baisse de {p} %.', 'ダッシュの待ち時間-{p}%。'],
  statusChance: ['+{p}% de chance de causar status.', '+{p}% status chance.', '+{p}% de probabilidad de estados.', '+{p} % de chance de statut.', '状態異常の確率+{p}%。'],
  resist: ['Status duram {p}% menos em você.', 'Status effects last {p}% shorter on you.', 'Los estados duran {p}% menos en ti.', 'Les statuts durent {p} % moins sur vous.', '自分への状態異常の時間-{p}%。'],
  regen: ['Recupera {n} de vida por segundo.', 'Recover {n} health per second.', 'Recuperas {n} de vida por segundo.', 'Récupère {n} de vie par seconde.', '毎秒HPを{n}回復。'],
  critChance: ['+{p}% de chance de golpe crítico (+50% de dano).', '+{p}% critical hit chance (+50% damage).', '+{p}% de probabilidad de crítico (+50% de daño).', '+{p} % de chance de coup critique (+50 % de dégâts).', 'クリティカル率+{p}%（ダメージ+50%）。'],
  critMult: ['+{m}% de dano nos golpes críticos.', '+{m}% damage on critical hits.', '+{m}% de daño en golpes críticos.', '+{m} % de dégâts sur les coups critiques.', 'クリティカルのダメージ+{m}%。'],
  lifesteal: ['Recupera {p}% do dano causado como vida.', 'Heal {p}% of the damage you deal.', 'Recuperas {p}% del daño causado como vida.', 'Récupère {p} % des dégâts infligés en vie.', '与えたダメージの{p}%をHPで回復。'],
  statusDmg: ['+{p}% de dano em alvos com status.', '+{p}% damage to targets with a status effect.', '+{p}% de daño a objetivos con estado.', '+{p} % de dégâts sur les cibles sous statut.', '状態異常の相手へのダメージ+{p}%。'],
  startEnergy: ['Cada round começa com +{n} de energia.', 'Each round starts with +{n} energy.', 'Cada asalto empieza con +{n} de energía.', 'Chaque round commence avec +{n} d’énergie.', '各ラウンド開始時のエネルギー+{n}。'],
};

function fill(tpl: string, vars: Record<string, string | number>, lang: Lang): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    const s = String(v);
    return lang === 'pt' || lang === 'es' || lang === 'fr' ? s.replace('.', ',') : s;
  });
}

const pct = (mult: number) => Math.round((mult - 1) * 100);
const less = (mult: number) => Math.round((1 - mult) * 100);
const secs = (ms: number) => String(Math.round(ms / 100) / 10);

function effectText(e: SkillEffect, lang: Lang): string {
  const T = (k: string, vars: Record<string, string | number>) => fill(pick(TPL[k], lang), vars, lang);
  switch (e.t) {
    case 'proc': {
      const on = e.on.map((a) => pick(ON[a], lang)).join(pick(AND, lang));
      const st = pick(STATUS[e.kind], lang);
      return e.chance >= 1 ? T('procAlways', { on, st, s: secs(e.ms) }) : T('proc', { on, st, p: Math.round(e.chance * 100), s: secs(e.ms) });
    }
    case 'dmg': return T('dmg', { p: pct(e.mult) });
    case 'flashdmg': return T('flashdmg', { p: pct(e.mult) });
    case 'strongdmg': return T('strongdmg', { p: pct(e.mult) });
    case 'ultdmg': return T('ultdmg', { p: pct(e.mult) });
    case 'taken': return T('taken', { p: less(e.mult) });
    case 'health': return T('health', { n: e.add });
    case 'speed': return T('speed', { p: pct(e.mult) });
    case 'shieldCost': return T('shieldCost', { p: less(e.mult) });
    case 'energyGain': return T('energyGain', { p: pct(e.mult) });
    case 'dashCd': return T('dashCd', { p: less(e.mult) });
    case 'statusChance': return T('statusChance', { p: pct(e.mult) });
    case 'resist': return T('resist', { p: less(e.mult) });
    case 'regen': return T('regen', { n: e.perSec });
    case 'crit': {
      const parts: string[] = [];
      if (e.chance > 0) parts.push(T('critChance', { p: Math.round(e.chance * 100) }));
      if (e.mult) parts.push(T('critMult', { m: Math.round(e.mult * 100) }));
      return parts.join(' ');
    }
    case 'lifesteal': return T('lifesteal', { p: Math.round(e.pct * 100) });
    case 'statusDmg': return T('statusDmg', { p: pct(e.mult) });
    case 'startEnergy': return T('startEnergy', { n: e.add });
  }
}

/** Nome do status / do golpe no idioma pedido (padrão: o atual). Reaproveitado pelos textos de bônus de raridade dos itens. */
export function statusLabel(kind: StatusKind, lang: Lang = getLang()): string {
  return pick(STATUS[kind], lang);
}
export function attackLabel(type: AttackType, lang: Lang = getLang()): string {
  return pick(ON[type], lang);
}

export function skillName(sk: SkillDef): string {
  const v = NAMES[sk.id];
  return v ? pick(v, getLang()) : sk.id;
}

export function skillDesc(sk: SkillDef): string {
  const lang = getLang();
  return sk.effects.map((e) => effectText(e, lang)).join(' ');
}

export function branchName(characterId: string, branch: number): string {
  const list = BRANCHES[characterId] ?? BRANCHES.dogge;
  return pick(list[branch], getLang());
}
