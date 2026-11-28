import { getLang } from '@/game/i18n/i18n';
import type { Lang } from '@/game/i18n/translations';
import type { AttackType, StatusKind } from '@/game/battle/Fighter';
import type { SkillDef, SkillEffect } from './skills';
import { SUPREMES } from '@/game/battle/supremes';

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
  // GADIGAGO (precisão, críticos e combos)
  gd_a1: ['Olho de Rival', 'Rival’s Eye', 'Ojo de Rival', 'Œil de Rival', 'ライバルの目'],
  gd_a2: ['Soco Calibrado', 'Calibrated Punch', 'Puñetazo Calibrado', 'Poing Calibré', '調整された拳'],
  gd_a3: ['Ponto Fraco', 'Weak Spot', 'Punto Débil', 'Point Faible', '急所'],
  gd_b1: ['Aquecimento', 'Warm-Up', 'Calentamiento', 'Échauffement', 'ウォームアップ'],
  gd_b2: ['Sequência Rápida', 'Quick Sequence', 'Secuencia Rápida', 'Séquence Rapide', '連続攻撃'],
  gd_b3: ['Finalização', 'Finisher', 'Remate', 'Finition', 'フィニッシュ'],
  gd_c1: ['Passada de Madrugada', 'Dawn Step', 'Paso de Madrugada', 'Pas de l’Aube', '夜明けの一歩'],
  gd_c2: ['Finta', 'Feint', 'Finta', 'Feinte', 'フェイント'],
  gd_c3: ['Contra-ataque', 'Counterattack', 'Contraataque', 'Contre-attaque', 'カウンター'],
  gd_d1: ['Caderno de Derrotas', 'Notebook of Defeats', 'Cuaderno de Derrotas', 'Carnet des Défaites', '敗北ノート'],
  gd_d2: ['Não Perco de Novo', 'Never Losing Again', 'No Pierdo Otra Vez', 'Plus Jamais Perdre', '二度と負けない'],
  gd_d3: ['Esforço Vence Talento', 'Effort Beats Talent', 'El Esfuerzo Vence al Talento', 'L’Effort Bat le Talent', '努力は才能に勝つ'],
  gd_f1: ['Mão Pesada', 'Heavy Hand', 'Mano Pesada', 'Main Lourde', '重い一撃'],
  gd_f2: ['Dança do Rival', 'Rival’s Dance', 'Danza del Rival', 'Danse du Rival', 'ライバルの舞'],
  gd_f3: ['Orgulho Ferido', 'Wounded Pride', 'Orgullo Herido', 'Fierté Blessée', '傷ついた誇り'],
  gd_f4: ['Troféu da Revanche', 'Trophy of Revenge', 'Trofeo de la Revancha', 'Trophée de la Revanche', '雪辱のトロフィー'],
  // ORC (força bruta e resistência)
  oc_a1: ['Punho Pesado', 'Heavy Fist', 'Puño Pesado', 'Poing Lourd', '重い拳'],
  oc_a2: ['Machado de Cozinha', 'Kitchen Axe', 'Hacha de Cocina', 'Hache de Cuisine', '厨房の斧'],
  oc_a3: ['Esmagador', 'Crusher', 'Aplastador', 'Écraseur', '粉砕者'],
  oc_b1: ['Farda Remendada', 'Patched Uniform', 'Uniforme Remendado', 'Uniforme Rapiécé', '継ぎ接ぎの軍服'],
  oc_b2: ['Escudo de Panela', 'Pot Shield', 'Escudo de Olla', 'Bouclier Casserole', '鍋の盾'],
  oc_b3: ['Muralha Cinzenta', 'Grey Wall', 'Muralla Gris', 'Muraille Grise', '灰色の壁'],
  oc_c1: ['Sopa Quente', 'Hot Soup', 'Sopa Caliente', 'Soupe Chaude', '熱いスープ'],
  oc_c2: ['Estômago de Ferro', 'Iron Stomach', 'Estómago de Hierro', 'Estomac de Fer', '鉄の胃袋'],
  oc_c3: ['Segunda Porção', 'Second Helping', 'Segunda Ración', 'Deuxième Portion', 'おかわり'],
  oc_d1: ['Bom Humor Teimoso', 'Stubborn Good Mood', 'Buen Humor Terco', 'Bonne Humeur Têtue', '頑固な上機嫌'],
  oc_d2: ['Ronda Noturna', 'Night Watch', 'Ronda Nocturna', 'Ronde de Nuit', '夜警'],
  oc_d3: ['Marcha Pesada', 'Heavy March', 'Marcha Pesada', 'Marche Lourde', '重い行進'],
  oc_f1: ['Quebra-Escudo', 'Shield Breaker', 'Rompescudos', 'Brise-Bouclier', '盾砕き'],
  oc_f2: ['Resistência de Caserna', 'Barracks Endurance', 'Resistencia de Cuartel', 'Endurance de Caserne', '兵舎の粘り強さ'],
  oc_f3: ['Sopa dos Decentes', 'Soup of the Decent', 'Sopa de los Decentes', 'Soupe des Honnêtes', '誠実な者のスープ'],
  oc_f4: ['Ordem Recusada', 'Order Refused', 'Orden Rechazada', 'Ordre Refusé', '拒まれた命令'],
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
    ['MIRA', 'AIM', 'PUNTERÍA', 'VISÉE', '狙い'],
    ['COMBO', 'COMBO', 'COMBO', 'COMBO', 'コンボ'],
    ['RITMO', 'RHYTHM', 'RITMO', 'RYTHME', 'リズム'],
    ['ORGULHO', 'PRIDE', 'ORGULLO', 'FIERTÉ', '誇り'],
    ['', '', '', '', ''],
    ['PODERES E SUPREMA', 'POWERS & SUPREME', 'PODERES Y SUPREMA', 'POUVOIRS ET SUPRÊME', '特殊技と究極技'],
  ],
  orc: [
    ['FORÇA', 'STRENGTH', 'FUERZA', 'FORCE', '力'],
    ['COURAÇA', 'ARMOR', 'CORAZA', 'CUIRASSE', '鎧'],
    ['VIGOR', 'VIGOR', 'VIGOR', 'VIGUEUR', '活力'],
    ['TEIMOSIA', 'STUBBORNNESS', 'TERQUEDAD', 'ENTÊTEMENT', '頑固'],
    ['', '', '', '', ''],
    ['PODERES E SUPREMA', 'POWERS & SUPREME', 'PODERES Y SUPREMA', 'POUVOIRS ET SUPRÊME', '特殊技と究極技'],
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
  critChance: ['+{p}% de chance de golpe crítico (+75% de dano).', '+{p}% critical hit chance (+75% damage).', '+{p}% de probabilidad de crítico (+75% de daño).', '+{p} % de chance de coup critique (+75 % de dégâts).', 'クリティカル率+{p}%（ダメージ+75%）。'],
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
    case 'supreme': return SUPREMES[e.id] ? pick(SUPREMES[e.id].desc, lang) : '';
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
