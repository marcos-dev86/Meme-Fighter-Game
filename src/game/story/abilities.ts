import type { Fighter } from '@/game/battle/Fighter';
import { getLang } from '@/game/i18n/i18n';
import type { IconName } from '@/game/ui/iconRegistry';

/**
 * Habilidade especial EXCLUSIVA de cada personagem jogável do modo história (uma por personagem, nenhuma repetida).
 * Este módulo não importa nenhum estado do jogo: quem sabe qual é o personagem do mundo atual (questState.ts) avisa por
 * setAbilityCharacter(), e cada sistema (luta, cassino, loja, baús, cura, mundo) pergunta aqui o que mudar.
 *
 * Regras de segurança:
 *  - applyAbility só vale uma vez por lutador (abilityId), então recarregar, trocar de tela ou salvar e carregar nunca duplica bônus.
 *  - O efeito nunca é gravado no save: ele é recalculado a partir do personagem do mundo.
 */
type Five = [string, string, string, string, string];

export type AbilityArea = 'combat' | 'casino' | 'shop' | 'loot' | 'heal' | 'world';

export interface AbilityDef {
  /** Id do personagem de história dono da habilidade. */
  characterId: string;
  id: string;
  area: AbilityArea;
  name: Five;
  /** Efeito, em uma frase, com os números reais. */
  effect: Five;
  /** Quando e como vale (automática ou manual, limites). */
  usage: Five;
}

export const ABILITIES: Record<string, AbilityDef> = {
  dogge: {
    characterId: 'dogge', id: 'segundo_folego', area: 'combat',
    name: ['Segundo Fôlego', 'Second Wind', 'Segundo Aliento', 'Second Souffle', '底力'],
    effect: ['Ao cair a 20% de vida ou menos, recupera 25% da vida máxima.', 'When health drops to 20% or less, recovers 25% of max health.', 'Al bajar al 20% de vida o menos, recupera el 25% de la vida máxima.', 'Quand la vie tombe à 20% ou moins, récupère 25% de la vie max.', '体力が20%以下になると、最大体力の25%を回復する。'],
    usage: ['Automática, uma vez por luta.', 'Automatic, once per fight.', 'Automática, una vez por pelea.', 'Automatique, une fois par combat.', '自動発動、1戦に1回。'],
  },
  gadigago: {
    characterId: 'gadigago', id: 'soco_certeiro', area: 'combat',
    name: ['Soco Certeiro', 'Sure Punch', 'Puñetazo Certero', 'Poing Précis', '会心の拳'],
    effect: ['+18 pontos de chance de golpe crítico em todos os ataques.', '+18 points of critical hit chance on every attack.', '+18 puntos de probabilidad de golpe crítico en todos los ataques.', '+18 points de chance de coup critique sur toutes les attaques.', '全ての攻撃でクリティカル率+18ポイント。'],
    usage: ['Automática, sempre ativa nas lutas.', 'Automatic, always on in fights.', 'Automática, siempre activa en las peleas.', 'Automatique, toujours active en combat.', '自動発動、戦闘中は常時有効。'],
  },
  orc: {
    characterId: 'orc', id: 'casca_grossa', area: 'combat',
    name: ['Casca Grossa', 'Thick Hide', 'Piel Gruesa', 'Peau Épaisse', '分厚い皮'],
    effect: ['Recebe 15% menos dano de todos os golpes.', 'Takes 15% less damage from every hit.', 'Recibe un 15% menos de daño de todos los golpes.', 'Subit 15% de dégâts en moins sur chaque coup.', '全ての攻撃から受けるダメージが15%減る。'],
    usage: ['Automática, sempre ativa nas lutas.', 'Automatic, always on in fights.', 'Automática, siempre activa en las peleas.', 'Automatique, toujours active en combat.', '自動発動、戦闘中は常時有効。'],
  },
  soldier: {
    characterId: 'soldier', id: 'disciplina_ferro', area: 'combat',
    name: ['Disciplina de Ferro', 'Iron Discipline', 'Disciplina de Hierro', 'Discipline de Fer', '鉄の規律'],
    effect: ['Começa cada luta com 35 de energia e o escudo gasta 40% menos energia.', 'Starts each fight with 35 energy and the shield costs 40% less energy.', 'Empieza cada pelea con 35 de energía y el escudo gasta un 40% menos.', 'Commence chaque combat avec 35 d’énergie et le bouclier coûte 40% de moins.', '各戦闘をエネルギー35で開始し、シールドの消費が40%減る。'],
    usage: ['Automática, no início de cada luta.', 'Automatic, at the start of each fight.', 'Automática, al inicio de cada pelea.', 'Automatique, au début de chaque combat.', '自動発動、各戦闘の開始時。'],
  },
  dogking: {
    characterId: 'dogking', id: 'uivo_real', area: 'combat',
    name: ['Uivo Real', 'Royal Howl', 'Aullido Real', 'Hurlement Royal', '王の咆哮'],
    effect: ['15% de chance de atordoar o oponente por 0,9 s ao acertar um golpe.', '15% chance to stun the opponent for 0.9 s on hit.', '15% de probabilidad de aturdir al rival 0,9 s al acertar.', '15% de chance d’étourdir l’adversaire 0,9 s en touchant.', '命中時に15%の確率で相手を0.9秒気絶させる。'],
    usage: ['Automática, em todo golpe que acerta.', 'Automatic, on every hit that lands.', 'Automática, en cada golpe que acierta.', 'Automatique, sur chaque coup qui touche.', '自動発動、命中するたびに判定。'],
  },
  tank: {
    characterId: 'tank', id: 'pele_de_rocha', area: 'combat',
    name: ['Pele de Rocha', 'Rock Skin', 'Piel de Roca', 'Peau de Roche', '岩の肌'],
    effect: ['Imune a queimadura e a veneno.', 'Immune to burn and poison.', 'Inmune a quemaduras y veneno.', 'Immunisé à la brûlure et au poison.', '火傷と毒を無効化する。'],
    usage: ['Automática, sempre ativa nas lutas.', 'Automatic, always on in fights.', 'Automática, siempre activa en las peleas.', 'Automatique, toujours active en combat.', '自動発動、戦闘中は常時有効。'],
  },
  ninja: {
    characterId: 'ninja', id: 'mao_leve', area: 'loot',
    name: ['Mão Leve', 'Light Fingers', 'Mano Ligera', 'Doigts Agiles', '軽い手'],
    effect: ['+35% de moedas em tesouros e baús, e 25% de chance de achar um item extra raro em baús.', '+35% coins from treasures and chests, and 25% chance of a rare bonus item from chests.', '+35% de monedas en tesoros y cofres, y 25% de probabilidad de un objeto raro extra en cofres.', '+35% de pièces dans les trésors et coffres, et 25% de chance d’un objet rare bonus dans les coffres.', '宝と宝箱のコイン+35%、宝箱で25%の確率でレアアイテムが追加で出る。'],
    usage: ['Automática, ao coletar tesouros e abrir baús.', 'Automatic, when collecting treasures and opening chests.', 'Automática, al recoger tesoros y abrir cofres.', 'Automatique, en ramassant des trésors et ouvrant des coffres.', '自動発動、宝の回収と宝箱を開けたとき。'],
  },
  mystic: {
    characterId: 'mystic', id: 'mente_aberta', area: 'combat',
    name: ['Mente Aberta', 'Open Mind', 'Mente Abierta', 'Esprit Ouvert', '開かれた心'],
    effect: ['Uma vida extra por luta: ao zerar a vida, revive com 1 de vida e fica imune por 1 s.', 'One extra life per fight: at zero health, revives with 1 health and is immune for 1 s.', 'Una vida extra por pelea: al llegar a cero, revive con 1 de vida e inmune 1 s.', 'Une vie en plus par combat : à zéro, revient avec 1 de vie et immunisé 1 s.', '1戦に1回の追加ライフ。体力0で体力1で復活し、1秒間無敵。'],
    usage: ['Automática, uma vez por luta.', 'Automatic, once per fight.', 'Automática, una vez por pelea.', 'Automatique, une fois par combat.', '自動発動、1戦に1回。'],
  },
  green_dragon: {
    characterId: 'green_dragon', id: 'seiva_viva', area: 'world',
    name: ['Seiva Viva', 'Living Sap', 'Savia Viva', 'Sève Vivante', '生命の樹液'],
    effect: ['Fora de combate, recupera 0,4% da vida máxima por segundo ao andar pelo mundo.', 'Out of combat, recovers 0.4% of max health per second while moving through the world.', 'Fuera de combate, recupera el 0,4% de la vida máxima por segundo al recorrer el mundo.', 'Hors combat, récupère 0,4% de la vie max par seconde en parcourant le monde.', '戦闘外でワールドを歩くと、毎秒最大体力の0.4%を回復する。'],
    usage: ['Automática, só no mundo, nunca passa da vida máxima.', 'Automatic, world only, never exceeds max health.', 'Automática, solo en el mundo, nunca pasa de la vida máxima.', 'Automatique, monde seulement, ne dépasse jamais la vie max.', '自動発動、ワールドのみ、最大体力は超えない。'],
  },
  ice_dragon: {
    characterId: 'ice_dragon', id: 'toque_de_gelo', area: 'combat',
    name: ['Toque de Gelo', 'Frost Touch', 'Toque Helado', 'Toucher de Givre', '氷の接触'],
    effect: ['Ao acertar, 8% (golpe rápido), 14% (forte) ou 30% (ultimate) de chance de congelar o oponente por 2 s.', 'On hit, 8% (flash), 14% (strong) or 30% (ultimate) chance to freeze the opponent for 2 s.', 'Al acertar, 8% (rápido), 14% (fuerte) o 30% (ultimate) de probabilidad de congelar 2 s.', 'En touchant, 8% (rapide), 14% (fort) ou 30% (ultime) de chance de geler 2 s.', '命中時、通常8%・強14%・必殺30%の確率で相手を2秒凍結する。'],
    usage: ['Automática, em todo golpe que acerta.', 'Automatic, on every hit that lands.', 'Automática, en cada golpe que acierta.', 'Automatique, sur chaque coup qui touche.', '自動発動、命中するたびに判定。'],
  },
  shadow_dragon: {
    characterId: 'shadow_dragon', id: 'sede_de_sombra', area: 'combat',
    name: ['Sede de Sombra', 'Shadow Thirst', 'Sed de Sombra', 'Soif d’Ombre', '影の渇き'],
    effect: ['Recupera 7% do dano que causa como vida.', 'Recovers 7% of the damage dealt as health.', 'Recupera el 7% del daño causado como vida.', 'Récupère 7% des dégâts infligés en vie.', '与えたダメージの7%を体力として回復する。'],
    usage: ['Automática, em todo golpe que acerta.', 'Automatic, on every hit that lands.', 'Automática, en cada golpe que acierta.', 'Automatique, sur chaque coup qui touche.', '自動発動、命中するたびに回復。'],
  },
  troll_face: {
    characterId: 'troll_face', id: 'sorte_absurda', area: 'casino',
    name: ['Sorte Absurda', 'Absurd Luck', 'Suerte Absurda', 'Chance Absurde', '異常な幸運'],
    effect: ['No cassino, 4% das rodadas perdidas são sorteadas de novo e vale o novo resultado (a vantagem da casa cai, mas continua existindo).', 'At the casino, 4% of lost rounds are redrawn and the new result counts (the house edge shrinks but never disappears).', 'En el casino, el 4% de las rondas perdidas se vuelven a sortear y vale el nuevo resultado (la ventaja de la casa baja, pero sigue existiendo).', 'Au casino, 4% des manches perdues sont retirées et le nouveau résultat compte (l’avantage de la maison baisse mais subsiste).', 'カジノで負けたラウンドの4%が再抽選され、新しい結果が有効になる（ハウスエッジは下がるが残る）。'],
    usage: ['Automática, em todos os jogos do cassino.', 'Automatic, in every casino game.', 'Automática, en todos los juegos del casino.', 'Automatique, dans tous les jeux du casino.', '自動発動、カジノの全ゲームで有効。'],
  },
  cara_tranquilo: {
    characterId: 'cara_tranquilo', id: 'preco_camarada', area: 'shop',
    name: ['Preço Camarada', 'Friendly Price', 'Precio Amigo', 'Prix d’Ami', '友情価格'],
    effect: ['Tudo nas lojas custa 20% menos (nunca menos de 1 moeda).', 'Everything in shops costs 20% less (never below 1 coin).', 'Todo en las tiendas cuesta un 20% menos (nunca menos de 1 moneda).', 'Tout coûte 20% de moins en boutique (jamais moins de 1 pièce).', '店の商品が20%安くなる（最低1コイン）。'],
    usage: ['Automática, em todas as lojas.', 'Automatic, in every shop.', 'Automática, en todas las tiendas.', 'Automatique, dans toutes les boutiques.', '自動発動、全ての店で有効。'],
  },
  sahur: {
    characterId: 'sahur', id: 'batida_contagiante', area: 'combat',
    name: ['Batida Contagiante', 'Catchy Beat', 'Ritmo Contagioso', 'Rythme Contagieux', 'ノリノリのビート'],
    effect: ['A barra de energia (ultimate) carrega 40% mais rápido, em golpes e na aura.', 'The energy (ultimate) bar fills 40% faster, from hits and aura charging.', 'La barra de energía (ultimate) carga un 40% más rápido, con golpes y aura.', 'La barre d’énergie (ultime) se remplit 40% plus vite, par les coups et l’aura.', 'エネルギー（必殺）ゲージが、攻撃でもオーラでも40%速く溜まる。'],
    usage: ['Automática, sempre ativa nas lutas.', 'Automatic, always on in fights.', 'Automática, siempre activa en las peleas.', 'Automatique, toujours active en combat.', '自動発動、戦闘中は常時有効。'],
  },
  sahur_god: {
    characterId: 'sahur_god', id: 'luz_restauradora', area: 'heal',
    name: ['Luz Restauradora', 'Restoring Light', 'Luz Restauradora', 'Lumière Réparatrice', '癒やしの光'],
    effect: ['Todos os efeitos de cura (poções, comida e regeneração) rendem 40% a mais.', 'Every healing effect (potions, food and regeneration) is 40% stronger.', 'Todos los efectos de curación (pociones, comida y regeneración) rinden un 40% más.', 'Tous les effets de soin (potions, nourriture et régénération) sont 40% plus forts.', '全ての回復効果（ポーション、食べ物、再生）が40%強くなる。'],
    usage: ['Automática, em itens e regeneração.', 'Automatic, on items and regeneration.', 'Automática, en objetos y regeneración.', 'Automatique, sur les objets et la régénération.', '自動発動、アイテムと再生に有効。'],
  },
  sahur_evil: {
    characterId: 'sahur_evil', id: 'brasa_no_calor', area: 'combat',
    name: ['Brasa no Calor', 'Ember in the Heat', 'Brasa en el Calor', 'Braise dans la Chaleur', '熱の燠火'],
    effect: ['25% de chance de queimar ao acertar (60% no ultimate), e a queimadura causa 50% mais dano. Imune a queimadura.', '25% chance to burn on hit (60% on ultimate), and burns deal 50% more damage. Immune to burn.', '25% de probabilidad de quemar al acertar (60% en el ultimate), y las quemaduras hacen un 50% más de daño. Inmune a quemaduras.', '25% de chance de brûler en touchant (60% à l’ultime), et la brûlure inflige 50% de dégâts en plus. Immunisé à la brûlure.', '命中時25%（必殺は60%）で火傷を与え、火傷ダメージが50%増える。火傷無効。'],
    usage: ['Automática, em todo golpe que acerta.', 'Automatic, on every hit that lands.', 'Automática, en cada golpe que acierta.', 'Automatique, sur chaque coup qui touche.', '自動発動、命中するたびに判定。'],
  },
};

/**
 * HABILIDADES PRINCIPAIS DE EXPLORAÇÃO (a 2ª habilidade principal de cada personagem, ao lado da de VERSUS).
 * Regra: Versus mexe só no lutador; Exploração mexe só no mundo (velocidade, peso, baús, cura...). Nenhuma das duas
 * vale no modo do outro. As 16 habilidades originais acima são a principal de UMA das duas categorias (area 'combat' =
 * Versus; as demais = Exploração); a que falta de cada personagem entra neste mapa, lote a lote das campanhas.
 */
export const EXPLORATION_ABILITIES: Record<string, AbilityDef> = {
  gadigago: {
    characterId: 'gadigago', id: 'pe_de_madrugada', area: 'world',
    name: ['Pé de Madrugada', 'Dawn Stride', 'Paso de Madrugada', 'Pas de l’Aube', '夜明けの足取り'],
    effect: ['Caminha e corre 10% mais rápido pelo mundo.', 'Walks and runs 10% faster across the world.', 'Camina y corre un 10% más rápido por el mundo.', 'Marche et court 10% plus vite dans le monde.', 'ワールドでの移動速度が10%上がる。'],
    usage: ['Automática, só no mundo (não vale em lutas nem no Versus).', 'Automatic, world only (does not apply in fights or Versus).', 'Automática, solo en el mundo (no vale en peleas ni en Versus).', 'Automatique, monde seulement (sans effet en combat ni en Versus).', '自動発動、ワールドのみ（戦闘とVersusでは無効）。'],
  },
  orc: {
    characterId: 'orc', id: 'costas_largas', area: 'world',
    name: ['Costas Largas', 'Broad Back', 'Espalda Ancha', 'Dos Large', '広い背中'],
    effect: ['Os itens pesam 30% menos na mochila: dá para carregar cerca de 43% mais peso.', 'Items weigh 30% less in the bag: you can carry about 43% more weight.', 'Los objetos pesan un 30% menos en la mochila: puedes cargar un 43% más de peso.', 'Les objets pèsent 30% de moins dans le sac : environ 43% de poids en plus.', 'バッグ内のアイテムの重さが30%減り、約43%多く運べる。'],
    usage: ['Automática, só no mundo (soma com o efeito da mochila; os espaços não mudam).', 'Automatic, world only (stacks with the bag effect; slots do not change).', 'Automática, solo en el mundo (se suma al efecto de la mochila; los espacios no cambian).', 'Automatique, monde seulement (s’ajoute à l’effet du sac ; les emplacements ne changent pas).', '自動発動、ワールドのみ（バッグ効果と重複、スロット数は変わらない）。'],
  },
};

/** Ícone de cada habilidade principal (assets/icons). As das campanhas ainda não entregues usam ícones provisórios existentes. */
export const ABILITY_ICONS: Record<string, IconName> = {
  segundo_folego: 'heart', soco_certeiro: 'ab_soco_certeiro', casca_grossa: 'ab_casca_grossa', disciplina_ferro: 'tower',
  uivo_real: 'crown', pele_de_rocha: 'moai', mao_leve: 'chest_open', mente_aberta: 'bulb', seiva_viva: 'tree',
  toque_de_gelo: 'snow', sede_de_sombra: 'shadowstar', sorte_absurda: 'dice', preco_camarada: 'coin',
  batida_contagiante: 'bolt', luz_restauradora: 'sun', brasa_no_calor: 'fire',
  pe_de_madrugada: 'ab_pe_madrugada', costas_largas: 'ab_costas_largas',
};
export function abilityIcon(a: AbilityDef): IconName {
  return ABILITY_ICONS[a.id] ?? 'star';
}

/** As duas habilidades principais do personagem (null onde a outra ainda não foi entregue). */
export type AbilityKind = 'versus' | 'exploration';
export function abilityKind(a: AbilityDef): AbilityKind {
  return a.area === 'combat' ? 'versus' : 'exploration';
}
export function mainAbilities(characterId: string | null | undefined): { versus: AbilityDef | null; exploration: AbilityDef | null } {
  const out: { versus: AbilityDef | null; exploration: AbilityDef | null } = { versus: null, exploration: null };
  const base = abilityOf(characterId);
  if (base) out[abilityKind(base)] = base;
  const extra = characterId ? EXPLORATION_ABILITIES[characterId] : undefined;
  if (extra) out[abilityKind(extra)] = extra;
  return out;
}

export const ABILITY_CHARACTERS = Object.keys(ABILITIES);

const LANG_INDEX: Record<string, number> = { pt: 0, en: 1, es: 2, fr: 3, ja: 4 };
const li = () => LANG_INDEX[getLang()] ?? 0;

export function abilityOf(characterId: string | null | undefined): AbilityDef | null {
  return (characterId && ABILITIES[characterId]) || null;
}
export function abilityName(a: AbilityDef): string {
  return a.name[li()];
}
export function abilityEffect(a: AbilityDef): string {
  return a.effect[li()];
}
export function abilityUsage(a: AbilityDef): string {
  return a.usage[li()];
}

/* ------------------------------------------------------------------ */
/* Personagem ativo do mundo (quem avisa é questState.ts)              */
/* ------------------------------------------------------------------ */
let activeCharacter = 'dogge';
export function setAbilityCharacter(id: string) {
  activeCharacter = id;
}
export function getAbilityCharacter(): string {
  return activeCharacter;
}
/** A habilidade `id` (ex.: 'sorte_absurda') é a do personagem do mundo atual? */
export function hasAbility(id: string): boolean {
  return ABILITIES[activeCharacter]?.id === id || EXPLORATION_ABILITIES[activeCharacter]?.id === id;
}

/* ------------------------------------------------------------------ */
/* Luta                                                               */
/* ------------------------------------------------------------------ */
/**
 * Aplica a habilidade de combate do personagem num lutador (uma vez só). Habilidades de outras áreas
 * (cassino, loja, baús, mundo) não mexem no lutador: elas são lidas pelos próprios sistemas.
 */
export function applyAbility(f: Fighter, characterId: string): boolean {
  const a = ABILITIES[characterId];
  if (!a || f.abilityId === a.id) return false;
  f.abilityId = a.id;
  switch (a.id) {
    case 'segundo_folego':
      f.secondWindPct = 0.25;
      f.secondWindUsed = false;
      break;
    case 'soco_certeiro':
      f.critChance += 0.18;
      break;
    case 'casca_grossa':
      f.damageTakenMult *= 0.85;
      break;
    case 'disciplina_ferro':
      f.startEnergy = Math.max(f.startEnergy, 35);
      f.energy = Math.max(f.energy, 35);
      f.shieldCost *= 0.6;
      break;
    case 'uivo_real':
      f.onHitStatus.push({ kind: 'stun', chance: 0.15, ms: 900, on: ['flash', 'strong', 'ultimate'], src: 'ability' });
      break;
    case 'pele_de_rocha':
      for (const k of ['burn', 'poison'] as const) if (!f.immune.includes(k)) f.immune.push(k);
      break;
    case 'mente_aberta':
      f.extraLives = 1;
      break;
    case 'toque_de_gelo':
      f.onHitStatus.push({ kind: 'freeze', chance: 0.08, ms: 2000, on: ['flash'], src: 'ability' });
      f.onHitStatus.push({ kind: 'freeze', chance: 0.14, ms: 2000, on: ['strong'], src: 'ability' });
      f.onHitStatus.push({ kind: 'freeze', chance: 0.3, ms: 2000, on: ['ultimate'], src: 'ability' });
      break;
    case 'sede_de_sombra':
      f.lifesteal += 0.07;
      break;
    case 'batida_contagiante':
      f.energyGainMult *= 1.4;
      f.chargeRate *= 1.4;
      break;
    case 'luz_restauradora':
      f.regenPerSec *= 1.4;
      break;
    case 'brasa_no_calor':
      f.onHitStatus.push({ kind: 'burn', chance: 0.25, ms: 4000, on: ['flash', 'strong'], src: 'ability' });
      f.onHitStatus.push({ kind: 'burn', chance: 0.6, ms: 4500, on: ['ultimate'], src: 'ability' });
      f.burnDotMult = 1.5;
      if (!f.immune.includes('burn')) f.immune.push('burn');
      break;
    default:
      break;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Exploração (Gadigago e Orc): só o mundo lê isto                    */
/* ------------------------------------------------------------------ */
export const DAWN_STRIDE_SPEED = 1.1;
/** Multiplicador da velocidade de caminhada no mundo (Pé de Madrugada, Gadigago). */
export function worldSpeedMult(): number {
  return hasAbility('pe_de_madrugada') ? DAWN_STRIDE_SPEED : 1;
}
export const BROAD_BACK_WEIGHT = 0.7;
/** Multiplicador do peso dos itens na mochila (Costas Largas, Orc). Soma com o efeito da mochila equipada. */
export function carryWeightMult(): number {
  return hasAbility('costas_largas') ? BROAD_BACK_WEIGHT : 1;
}

/* ------------------------------------------------------------------ */
/* Cassino (Troll Face)                                               */
/* ------------------------------------------------------------------ */
/** Calibrado com tools/casino-sim: o retorno ao jogador fica entre 96% e 99,8% (a casa nunca perde no longo prazo). */
export const LUCK_REROLL_CHANCE = 0.04;
export const LUCK_PAYOUT_BONUS = 0;

/**
 * Sorteia um resultado. Com Sorte Absurda, um resultado que paga MENOS que a aposta (perdeu) tem LUCK_REROLL_CHANCE de
 * ser sorteado de novo (vale o novo). `payoutOf` diz quanto o resultado paga (0 = perdeu). `rng` padrão: Math.random.
 */
export function luckyRoll<T>(roll: () => T, payoutOf: (r: T) => number, bet: number, rng: () => number = Math.random, active = hasAbility('sorte_absurda')): T {
  const first = roll();
  if (!active || payoutOf(first) >= bet || rng() >= LUCK_REROLL_CHANCE) return first;
  return roll();
}
/** Prêmio com o bônus da sorte: só quando deu lucro (empate devolve a aposta e não ganha bônus). Moedas inteiras. */
export function luckyPayout(payout: number, bet: number, active = hasAbility('sorte_absurda')): number {
  return active && payout > bet ? Math.round(payout * (1 + LUCK_PAYOUT_BONUS)) : payout;
}

/* ------------------------------------------------------------------ */
/* Lojas (Cara Tranquilo)                                             */
/* ------------------------------------------------------------------ */
export const SHOP_DISCOUNT = 0.2;
/** Preço final numa loja (desconto de Preço Camarada, mínimo 1 moeda). */
export function shopPrice<T extends number | null>(price: T): T {
  if (price === null || !hasAbility('preco_camarada') || price <= 0) return price;
  return Math.max(1, Math.round(price * (1 - SHOP_DISCOUNT))) as T;
}

/* ------------------------------------------------------------------ */
/* Baús e tesouros (Ninja)                                            */
/* ------------------------------------------------------------------ */
export const LOOT_COIN_MULT = 1.35;
export const LOOT_BONUS_CHANCE = 0.25;
export const LOOT_BONUS_POOL = ['potion_hp_l', 'power_brew', 'potion_guard'];
export function lootCoins(coins: number): number {
  return hasAbility('mao_leve') && coins > 0 ? Math.round(coins * LOOT_COIN_MULT) : coins;
}
/** Item raro extra ao abrir um baú (ou null). `rng` serve para testes. */
export function lootBonusItem(rng: () => number = Math.random): string | null {
  if (!hasAbility('mao_leve') || rng() >= LOOT_BONUS_CHANCE) return null;
  return LOOT_BONUS_POOL[Math.floor(rng() * LOOT_BONUS_POOL.length) % LOOT_BONUS_POOL.length];
}

/* ------------------------------------------------------------------ */
/* Cura (Sahur God) e mundo (Dragão Verde)                            */
/* ------------------------------------------------------------------ */
export const HEAL_BONUS = 0.4;
export function healMult(): number {
  return hasAbility('luz_restauradora') ? 1 + HEAL_BONUS : 1;
}
/** Fração da vida máxima recuperada por segundo no mundo (Seiva Viva). 0 se não tiver a habilidade. */
export const SAP_REGEN_PER_SEC = 0.004;
export function worldRegenPerSec(): number {
  return hasAbility('seiva_viva') ? SAP_REGEN_PER_SEC : 0;
}
