import type { CodeActor, CodeBeat, CodeCutscene } from '../codeCutscenes';
import type { CutsceneTexts } from '../cutsceneText';

/**
 * Cutscenes do Dogge feitas à mão (não vieram da conversão dos vídeos): o flashback do Vovô Bento e as cenas curtas de
 * sistema (cassino, escalada, baú, subir de nível).
 */
const player = (extra: Partial<CodeActor> = {}): CodeActor => ({ char: 'dogge', x: 0.5, y: 0.8, h: 0.5, player: true, ...extra });
const MEM = 'rgba(150,110,50,0.32)';

const FLASHBACK: CodeCutscene = {
  id: '01_flashback_vovo',
  characterId: 'dogge',
  music: 'medieval_library',
  ambient: 'wind',
  beats: [
    { bg: 'stage2', tint: MEM, shot: true, title: 'FLASHBACK', ms: 3600, cam: { z0: 1, z1: 1.08 }, actors: [{ char: 'c08', kind: 'npc', x: -0.12, y: 0.7, h: 1.9, anim: 'none', dir: 'right', path: [{ t: 0, x: -0.12, y: 0.7 }, { t: 3000, x: 0.37, y: 0.7 }] }] },
    { bg: 'stage2', tint: MEM, speaker: 'Vovô Bento', text: 'Há muito tempo, esta ilha era inteira, e os memes viviam em paz.', ms: 5200, actors: [{ char: 'c08', kind: 'npc', x: 0.37, y: 0.7, h: 1.9, enter: 'none', anim: 'none' }] },
    { bg: 'stage2', tint: MEM, speaker: 'Vovô Bento', text: 'Até o dia em que o poder que a mantinha unida se partiu.', ms: 4800, fx: ['flash', 'shake'], actors: [{ char: 'c08', kind: 'npc', x: 0.37, y: 0.7, h: 1.9, enter: 'none', anim: 'none' }], sfx: [{ key: 'thunder', at: 2800, vol: 0.7 }] },
    { bg: 'stage1', tint: MEM, shot: true, speaker: 'Vovô Bento', text: 'Um guardião ficou com cada pedaço. Na floresta, o Dragão da Floresta...', ms: 5000, actors: [{ char: 'green_dragon', x: 0.5, y: 0.67, h: 0.55, anim: 'bob' }] },
    { bg: 'stage5', tint: MEM, shot: true, speaker: 'Vovô Bento', text: '...no gelo, o Dragão do Gelo...', ms: 4200, actors: [{ char: 'ice_dragon', x: 0.5, y: 0.67, h: 0.55, anim: 'bob' }] },
    { bg: 'stage6', tint: MEM, shot: true, speaker: 'Vovô Bento', text: '...e nas trevas, o Dragão Sombrio.', ms: 4200, actors: [{ char: 'shadow_dragon', x: 0.5, y: 0.67, h: 0.55, anim: 'bob' }] },
    { bg: 'stage2', tint: MEM, shot: true, speaker: 'Vovô Bento', text: 'Só quem reunir as três partes vai entender o que realmente foi perdido.', ms: 5600, actors: [{ char: 'c08', kind: 'npc', x: 0.5, y: 0.7, h: 1.9, enter: 'fade', anim: 'none' }] },
  ],
};

/** Cena curta de uma tela só: cenário + faixa de título + ícones + sons. */
function short(id: string, bg: string, title: string, ms: number, extra: Partial<CodeBeat>, music?: string): CodeCutscene {
  return { id, characterId: 'dogge', music, beats: [{ bg, shot: true, title, ms, ...extra }] };
}
const triple = (name: string) => [0.36, 0.5, 0.64].map((x) => ({ name, x, y: 0.5, size: 84 }));
const coinsSfx = (n: number, from: number) => Array.from({ length: n }, (_, i) => ({ key: 'coin', at: from + i * 220, vol: 0.7 }));

export const DOGGE_EXTRA_CUTSCENES: CodeCutscene[] = [
  FLASHBACK,
  short('climb_montanha_sobe', 'ice', 'ESCALANDO...', 6000, { actors: [player({ pose: 'strong', anim: 'jump', y: 0.82, h: 0.55 })], icons: [{ name: 'pickaxe', x: 0.58, y: 0.55, size: 64 }], sfx: Array.from({ length: 8 }, (_, i) => ({ key: 'climb', at: 300 + i * 620, vol: 0.8 })) }, 'frozen_wastes'),
  short('climb_montanha_desce', 'ice', 'DESCENDO...', 5000, { actors: [player({ pose: 'walk', anim: 'bob', y: 0.82, h: 0.55 })], icons: [{ name: 'pickaxe', x: 0.58, y: 0.55, size: 64 }], sfx: Array.from({ length: 6 }, (_, i) => ({ key: 'climb', at: 300 + i * 620, vol: 0.8 })) }, 'frozen_wastes'),
  short('climb_vulcao_sobe', 'lava', 'ESCALANDO...', 6000, { actors: [player({ pose: 'strong', anim: 'jump', y: 0.82, h: 0.55 })], icons: [{ name: 'pickaxe', x: 0.58, y: 0.55, size: 64 }], sfx: Array.from({ length: 8 }, (_, i) => ({ key: 'climb', at: 300 + i * 620, vol: 0.8 })) }, 'mountain_pass'),
  short('climb_vulcao_desce', 'lava', 'DESCENDO...', 5000, { actors: [player({ pose: 'walk', anim: 'bob', y: 0.82, h: 0.55 })], icons: [{ name: 'pickaxe', x: 0.58, y: 0.55, size: 64 }], sfx: Array.from({ length: 6 }, (_, i) => ({ key: 'climb', at: 300 + i * 620, vol: 0.8 })) }, 'mountain_pass'),
  short('cassino_slot_dog', 'casino', 'TRÊS IGUAIS!', 5600, { fx: ['flash'], icons: triple('dog'), sfx: [{ key: 'swing', at: 300, vol: 0.6 }, { key: 'levelup', at: 2400, vol: 0.8 }, ...coinsSfx(10, 2550)] }, 'retrofuture'),
  short('cassino_slot_banana', 'casino', 'TRÊS IGUAIS!', 5600, { fx: ['flash'], icons: triple('banana'), sfx: [{ key: 'swing', at: 300, vol: 0.6 }, { key: 'levelup', at: 2400, vol: 0.8 }, ...coinsSfx(10, 2550)] }, 'retrofuture'),
  short('cassino_slot_moai', 'casino', 'TRÊS IGUAIS!', 5600, { fx: ['flash'], icons: triple('moai'), sfx: [{ key: 'swing', at: 300, vol: 0.6 }, { key: 'levelup', at: 2400, vol: 0.8 }, ...coinsSfx(10, 2550)] }, 'retrofuture'),
  short('cassino_slot_joker', 'casino', 'TRÊS IGUAIS!', 5600, { fx: ['flash'], icons: triple('crown'), sfx: [{ key: 'swing', at: 300, vol: 0.6 }, { key: 'levelup', at: 2400, vol: 0.8 }, ...coinsSfx(10, 2550)] }, 'retrofuture'),
  short('cassino_slot_gem', 'casino', 'TRÊS IGUAIS!', 5600, { fx: ['flash'], icons: triple('gem'), sfx: [{ key: 'swing', at: 300, vol: 0.6 }, { key: 'levelup', at: 2400, vol: 0.8 }, ...coinsSfx(10, 2550)] }, 'retrofuture'),
  short('cassino_slot_777', 'casino', 'JACKPOT 777!', 8000, { fx: ['flash', 'shake'], icons: triple('seven'), sfx: [{ key: 'swing', at: 300, vol: 0.6 }, { key: 'levelup', at: 3200, vol: 0.9 }, ...coinsSfx(14, 3400)] }, 'retrofuture'),
  short('cassino_cara_coroa', 'casino', 'VITÓRIA!', 5000, { fx: ['flash'], icons: [{ name: 'coin', x: 0.5, y: 0.5, size: 96 }], sfx: [{ key: 'swing', at: 300, vol: 0.6 }, { key: 'levelup', at: 2400, vol: 0.8 }, ...coinsSfx(9, 2550)] }, 'retrofuture'),
  short('cassino_dados', 'casino', 'VITÓRIA!', 5000, { fx: ['flash'], icons: [{ name: 'dice', x: 0.44, y: 0.5, size: 88 }, { name: 'dice', x: 0.56, y: 0.5, size: 88 }], sfx: [{ key: 'swing', at: 300, vol: 0.6 }, { key: 'levelup', at: 2400, vol: 0.8 }, ...coinsSfx(9, 2550)] }, 'retrofuture'),
  short('cassino_roleta', 'casino', 'VITÓRIA!', 5000, { fx: ['flash'], icons: [{ name: 'roulette', x: 0.5, y: 0.5, size: 110 }], sfx: [{ key: 'swing', at: 300, vol: 0.6 }, { key: 'levelup', at: 2400, vol: 0.8 }, ...coinsSfx(9, 2550)] }, 'retrofuture'),
  short('cassino_cartas', 'casino', 'VITÓRIA!', 5000, { fx: ['flash'], icons: [{ name: 'card', x: 0.5, y: 0.5, size: 96 }], sfx: [{ key: 'swing', at: 300, vol: 0.6 }, { key: 'levelup', at: 2400, vol: 0.8 }, ...coinsSfx(9, 2550)] }, 'retrofuture'),
  short('bau_tesouro', 'forest', 'TESOURO ENCONTRADO!', 5000, { fx: ['flash'], icons: [{ name: 'chest_open', x: 0.5, y: 0.52, size: 110 }, { name: 'sparkle', x: 0.4, y: 0.4, size: 40 }, { name: 'sparkle', x: 0.6, y: 0.42, size: 40 }], sfx: [{ key: 'landing', at: 400, vol: 0.7 }, { key: 'levelup', at: 1200, vol: 0.8 }, ...coinsSfx(10, 1350)] }, 'secret_garden'),
  short('subiu_de_nivel', 'sunset', 'SUBIU DE NÍVEL!', 4200, { fx: ['flash'], actors: [player({ pose: 'strong', anim: 'jump', y: 0.85, h: 0.5 })], icons: [{ name: 'star', x: 0.36, y: 0.4, size: 56 }, { name: 'star', x: 0.64, y: 0.4, size: 56 }], sfx: [{ key: 'charge', at: 200, vol: 0.7 }, { key: 'levelup', at: 1600, vol: 0.9 }, { key: 'speed_up', at: 1700, vol: 0.5 }] }, 'comic_hero'),
];

export const DOGGE_EXTRA_TEXTS: CutsceneTexts = {
  FLASHBACK: ['FLASHBACK', 'FLASHBACK', 'FLASHBACK', 'フラッシュバック'],
  'Há muito tempo, esta ilha era inteira, e os memes viviam em paz.': ['Long ago, this island was whole, and the memes lived in peace.', 'Hace mucho tiempo, esta isla era entera y los memes vivían en paz.', 'Il y a longtemps, cette île était entière et les memes vivaient en paix.', '昔々、この島はひとつで、ミームたちは平和に暮らしていた。'],
  'Até o dia em que o poder que a mantinha unida se partiu.': ['Until the day the power that held it together broke.', 'Hasta el día en que el poder que la mantenía unida se rompió.', 'Jusqu’au jour où le pouvoir qui la tenait unie s’est brisé.', 'それをつなぎとめていた力が砕ける、その日までは。'],
  'Um guardião ficou com cada pedaço. Na floresta, o Dragão da Floresta...': ['A guardian kept each piece. In the forest, the Forest Dragon...', 'Un guardián se quedó con cada pedazo. En el bosque, el Dragón del Bosque...', 'Un gardien a gardé chaque morceau. Dans la forêt, le Dragon de la Forêt...', '守護者がそれぞれの欠片を持った。森には森のドラゴン...'],
  '...no gelo, o Dragão do Gelo...': ['...in the ice, the Ice Dragon...', '...en el hielo, el Dragón de Hielo...', '...dans la glace, le Dragon de Glace...', '...氷には氷のドラゴン...'],
  '...e nas trevas, o Dragão Sombrio.': ['...and in the darkness, the Shadow Dragon.', '...y en las tinieblas, el Dragón Sombrío.', '...et dans les ténèbres, le Dragon des Ombres.', '...そして闇には影のドラゴン。'],
  'Só quem reunir as três partes vai entender o que realmente foi perdido.': ['Only those who gather the three parts will understand what was truly lost.', 'Solo quien reúna las tres partes entenderá lo que realmente se perdió.', 'Seul celui qui réunira les trois parties comprendra ce qui fut vraiment perdu.', '三つの欠片を集めた者だけが、本当に失われたものを知るだろう。'],
  'ESCALANDO...': ['CLIMBING...', 'ESCALANDO...', 'ESCALADE...', '登っている...'],
  'DESCENDO...': ['DESCENDING...', 'DESCENDIENDO...', 'DESCENTE...', '下っている...'],
  'TRÊS IGUAIS!': ['THREE OF A KIND!', '¡TRES IGUALES!', 'TROIS IDENTIQUES !', '三つ揃い！'],
  'JACKPOT 777!': ['JACKPOT 777!', '¡JACKPOT 777!', 'JACKPOT 777 !', 'ジャックポット777！'],
  'VITÓRIA!': ['VICTORY!', '¡VICTORIA!', 'VICTOIRE !', '勝利！'],
  'TESOURO ENCONTRADO!': ['TREASURE FOUND!', '¡TESORO ENCONTRADO!', 'TRÉSOR TROUVÉ !', '宝を発見！'],
  'SUBIU DE NÍVEL!': ['LEVEL UP!', '¡SUBISTE DE NIVEL!', 'NIVEAU SUPÉRIEUR !', 'レベルアップ！'],
};
