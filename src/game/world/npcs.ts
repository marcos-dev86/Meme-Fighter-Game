import { PLAZA_SQUARE, REGION_ANCHORS, IGLOO_TILE, CAVE_GUARDIAN_SPOT, FERRY_DOCKS } from './worldGen';
import type { CharacterKey } from '@/game/battle/Fighter';

/**
 * "Igual do Pokémon FireRed, tipo o Professor Carvalho" was given as a
 * style reference (a welcoming mentor figure), not a name to reuse : 
 * Professor Carvalho/Oak is a specific Nintendo character, so these are
 * original people instead, doing the same narrative job.
 *
 * v2 (this pass): the "enemy" kind planned for above is now in use - a
 * medieval raider band (secondary villains, invented name "Legião
 * Cinzenta" rather than reusing another franchise's villain team) at the
 * walled camp, and the dog family (dogking + two guards) on the island.
 * Same reasoning as the mentor NPC above: original characters playing a
 * familiar role, not reused IP.
 */

export type NpcKind = 'friendly' | 'enemy' | 'meme';

export const NPC_KIND_COLOR: Record<NpcKind, string> = {
  friendly: '#3fa7d6',
  enemy: '#d63f3f',
  meme: '#b23fd6',
};

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  kind: NpcKind;
  dialogue: string[];
  giftItemId?: string;
  skinColor: string;
  outfitColor: string;
  hairColor: string;
  /** If set, this NPC renders using a real fighter sprite instead of the generic silhouette. */
  fighterSprite?: CharacterKey;
  /** For NPCs with real art who aren't a battle fighter (no moveset/stats
   * to build) - a plain portrait image instead of the generic silhouette. */
  portraitSprite?: number;
  /** A character from the user's sprite pack (see npcSheet.ts) - used by every NPC that has no fighter sprite/portrait of its own. */
  sheetChar?: string;
  /** If set, talking to this NPC can offer/track a quest (see questState.ts). */
  questId?: string;
}

export const NPCS: Record<string, NpcDef> = {
  bento: {
    id: 'bento',
    sheetChar: 'c08',
    name: 'Vovô Bento',
    role: 'Ancião da Praça',
    kind: 'friendly',
    skinColor: '#e8b98a',
    outfitColor: '#5b7fa6',
    hairColor: '#e8e8e8',
    dialogue: [
      'Ah, um rosto novo na praça! Seja bem-vindo a Meme-Fighter.',
      'Esse mundo ainda tá crescendo: cada rua nova leva a alguém com uma história.',
      'O Dogge e o Gadigago treinam por aqui de vez em quando. Bons lutadores, os dois.',
      'Se precisar de alguma coisa, é só voltar aqui na praça.',
    ],
  },
  marina: {
    id: 'marina',
    sheetChar: 'c11',
    name: 'Marina',
    role: 'Comerciante',
    kind: 'friendly',
    skinColor: '#d99a6c',
    outfitColor: '#c0392b',
    hairColor: '#3a2418',
    dialogue: ['Bem-vindo à loja! Dá uma olhada, tenho item novo toda semana.', 'Memecoin é a moeda por aqui: junte explorando o mapa.'],
  },
  croupier: {
    id: 'croupier',
    sheetChar: 'c20',
    name: 'Crupiê Misterioso',
    role: 'Dono do Cassino',
    kind: 'meme',
    skinColor: '#e0b890',
    outfitColor: '#222222',
    hairColor: '#111111',
    dialogue: [
      'Bem-vindo ao Cassino Misterioso! Aqui só se aposta Memecoin.',
      'Caça-níquel ou cara-ou-coroa: a casa sempre ganha um pouquinho... mas a sorte é sua.',
    ],
  },
  maximilian: {
    id: 'maximilian',
    sheetChar: 'c18',
    name: 'Maximilian',
    role: 'Armeiro',
    kind: 'friendly',
    skinColor: '#c78e5e',
    outfitColor: '#2c3e8c',
    hairColor: '#1a1a1a',
    dialogue: [
      'Marina vende o que se come e se bebe no dia a dia. Eu cuido do que se usa na luta.',
      'Armas, escudo, bombas, poções fortes e buffs: tudo para quem vai brigar de verdade.',
      'Cada nível que você sobe rende 1 ponto de status. Gaste no menu de pausa, em STATUS > Pontos de Poder.',
    ],
  },
  iracema: {
    id: 'iracema',
    sheetChar: 'c09',
    name: 'Dona Iracema',
    role: 'Costureira',
    kind: 'friendly',
    skinColor: '#e8b98a',
    outfitColor: '#8e44ad',
    hairColor: '#888888',
    dialogue: [
      'Entra, entra, fique à vontade.',
      'Sou costureira. Faço chapéus, capas e até tingimento de pelagem. Nada disso deixa ninguém mais forte, mas deixa muito mais bonito!',
      'Ando ouvindo rumores de algo escondido perto da floresta. Isso é conversa pra outro dia.',
    ],
  },
  zeca: {
    id: 'zeca',
    sheetChar: 'c10',
    name: 'Zeca',
    role: 'Pescador',
    kind: 'friendly',
    skinColor: '#c98a5e',
    outfitColor: '#2e8b7a',
    hairColor: '#2a2a2a',
    dialogue: ['O mar por aqui é calmo, bom pra pescar.', 'Já vi gente andando pela água baixa perto das pedras. Deve ter algo ali.'],
  },
  barqueiro: {
    id: 'barqueiro',
    sheetChar: 'c13',
    name: 'Barqueiro',
    role: 'Barqueiro do Cais',
    kind: 'friendly',
    skinColor: '#c98a5e',
    outfitColor: '#2e5a8a',
    hairColor: '#e8e8e8',
    dialogue: ['Maré boa hoje! Meu barco está logo ali, amarrado no cais.', 'Pra onde vai? Eu levo você a qualquer ilha que já esteja aberta nas cartas do navegador.'],
  },
  mercador_gelo: {
    id: 'mercador_gelo',
    sheetChar: 'c21',
    name: 'Pedro Gélido',
    role: 'Mercador da Montanha',
    kind: 'friendly',
    skinColor: '#e0b090',
    outfitColor: '#4a6f9a',
    hairColor: '#c9c9c9',
    dialogue: ['Aqui no gelo, quem não sobe com piolet, não sobe!', 'Vendo o piolet e uns comes e bebes pra aguentar o frio. Dá uma olhada.'],
  },
  alpinista: {
    id: 'alpinista',
    sheetChar: 'c18',
    name: 'Helga',
    role: 'Alpinista',
    kind: 'friendly',
    skinColor: '#f0c8a8',
    outfitColor: '#c0392b',
    hairColor: '#e8c24a',
    dialogue: ['Está vendo aquela parede de gelo azul? É o único caminho pro topo.', 'Sem piolet, nem adianta tentar. O Pedro, ali na loja, vende um.', 'Lá em cima ficam o iglu, a pedra Moai e uma vista incrível.'],
  },
  iara: {
    id: 'iara',
    sheetChar: 'c17',
    name: 'Iara',
    role: 'Guarda-Florestal',
    kind: 'friendly',
    skinColor: '#d99a6c',
    outfitColor: '#27632a',
    hairColor: '#4a2e1a',
    dialogue: ['Cuidado na mata fechada, é fácil se perder.', 'Já achei coisa interessante largada por aí. Vale a pena procurar.'],
    giftItemId: 'map_fragment',
  },
  brasa: {
    id: 'brasa',
    sheetChar: 'c06',
    name: 'Brasa',
    role: 'Ferreiro',
    kind: 'friendly',
    skinColor: '#a85d3a',
    outfitColor: '#6b4226',
    hairColor: '#1a1a1a',
    dialogue: ['A vila de fogo não é fácil de morar, mas é lar.', 'A lava fresca aqui perto é boa pra forjar. Um dia faço algo bacana pra você.'],
  },
  rocha: {
    id: 'rocha',
    sheetChar: 'c04',
    name: 'Rocha',
    role: 'Alpinista',
    kind: 'friendly',
    skinColor: '#e8b98a',
    outfitColor: '#7f8c8d',
    hairColor: '#5a3a1a',
    dialogue: ['Essa montanha esconde mais do que parece.', 'Achei uma moeda velha subindo outro dia. Deve ter mais por aí.'],
  },
  rival: {
    id: 'rival',
    name: 'Gadigago',
    role: 'Seu Rival',
    kind: 'meme',
    skinColor: '#e8b98a',
    outfitColor: '#d63f3f',
    hairColor: '#1a1a1a',
    fighterSprite: 'gadigago',
    questId: 'rival_battle',
    dialogue: [
      'Aí, cheguei primeiro de novo!',
      'Vim treinar aqui na praça. Bora ver quem é melhor, agora mesmo?',
    ],
  },
  orc_guard: {
    id: 'orc_guard',
    name: 'Grosh',
    role: 'Guarda da Legião Cinzenta',
    kind: 'enemy',
    skinColor: '#7a9a5a',
    outfitColor: '#4a3a2a',
    hairColor: '#2a1a1a',
    fighterSprite: 'orc',
    dialogue: ['Esse acampamento é território da Legião. Vaza.', 'Se quer passar, fala com o capitão. Se ele deixar.'],
  },
  soldier_captain: {
    id: 'soldier_captain',
    name: 'Capitão Ferro',
    role: 'Líder da Legião Cinzenta',
    kind: 'enemy',
    skinColor: '#d9b38a',
    outfitColor: '#5a5a6a',
    hairColor: '#6a4a2a',
    fighterSprite: 'soldier',
    questId: 'camp_showdown',
    dialogue: [
      'A Legião Cinzenta tava aqui antes de qualquer praça, sabia?',
      'Esse mapa inteiro devia ser nosso. Prova que merece ficar: luta comigo.',
    ],
  },
  footman_dog: {
    id: 'footman_dog',
    name: 'Footman',
    role: 'Guarda da Ilha',
    kind: 'enemy',
    skinColor: '#3a2a3a',
    outfitColor: '#5a1a1a',
    hairColor: '#1a0a1a',
    portraitSprite: require('../../../assets/legacy-sprites/footman/idle.png'),
    dialogue: ['Au. AU. Ninguém passa da praia sem falar com o Rei.'],
  },
  tank_dog: {
    id: 'tank_dog',
    name: 'Tank',
    role: 'Guarda da Ilha',
    kind: 'enemy',
    skinColor: '#3a2a3a',
    outfitColor: '#5a1a1a',
    hairColor: '#1a0a1a',
    portraitSprite: require('../../../assets/legacy-sprites/tank/idle.png'),
    dialogue: ['(esse aqui só rosna e não sai do lugar)'],
  },
  dogking: {
    id: 'dogking',
    name: 'Rei dos Cães',
    role: 'Chefe da Ilha',
    kind: 'enemy',
    skinColor: '#3a2a3a',
    outfitColor: '#6a1a1a',
    hairColor: '#1a0a1a',
    fighterSprite: 'dogking',
    questId: 'island_boss',
    dialogue: [
      'Então é você que anda deixando o Dogge se achar por aí.',
      'Família é família. Ninguém bate no meu parente e sai andando. Prova seu valor.',
    ],
  },
  silvana: {
    id: 'silvana',
    name: 'Silvana',
    role: 'Arqueira Errante',
    kind: 'friendly',
    skinColor: '#e8b98a',
    outfitColor: '#2f5c33',
    hairColor: '#1a2a1a',
    portraitSprite: require('../../../assets/legacy-sprites/hood/idle.png'),
    dialogue: ['Ando de vila em vila, sempre com o arco pronto.', 'Essa floresta tem mais trilha escondida do que parece à primeira vista.'],
  },
  tico: {
    id: 'tico',
    name: 'Irmão Tico',
    role: 'Monge Viajante',
    kind: 'friendly',
    skinColor: '#d9b38a',
    outfitColor: '#6b4a2a',
    hairColor: '#2a1a1a',
    portraitSprite: require('../../../assets/legacy-sprites/monk/idle.png'),
    dialogue: ['A Legião Cinzenta ali na frente não recebe bem quem passa. Cuidado.', 'Viajo em busca de paz. Esse acampamento atrapalha um pouco meus planos.'],
  },
  moai: {
    id: 'moai',
    name: 'Sigma Boy',
    role: 'Lenda Urbana',
    kind: 'meme',
    skinColor: '#8a8a7a',
    outfitColor: '#8a8a7a',
    hairColor: '#8a8a7a',
    portraitSprite: require('../../../assets/legacy-sprites/moai/idle.png'),
    dialogue: ['...', '(Sigma Boy só encara você em silêncio. Ele não precisa falar.)'],
  },
  guardiao_pedra: {
    id: 'guardiao_pedra',
    sheetChar: 'c05',
    name: 'Guardião de Pedra',
    role: 'Vigia da Caverna',
    kind: 'friendly',
    skinColor: '#8a8a8a',
    outfitColor: '#5a5a5a',
    hairColor: '#4a4a4a',
    questId: 'cave_guardian',
    dialogue: [
      'Poucos param pra falar comigo. A maioria só passa direto pra dentro.',
      'Essa caverna é mais funda do que parece daqui de fora. Tenha cuidado.',
    ],
  },
  tank_vulcao: {
    id: 'tank_vulcao',
    name: 'Tank',
    role: 'Guardião do Vulcão',
    kind: 'enemy',
    skinColor: '#3a2a3a',
    outfitColor: '#5a1a1a',
    hairColor: '#1a0a1a',
    fighterSprite: 'tank',
    questId: 'vulcao_boss',
    dialogue: [
      'O Rei me mandou pra frente. Ninguém chega na Ilha das Trevas sem passar por mim.',
      'Já vi gente forte tentar. Nenhum passou.',
    ],
  },
  // v4 (this pass): 5 more "amigáveis memes" - no fight mode (no
  // fighterSprite, same as Sigma Boy), real portrait art this time
  // (uploaded by the user) instead of the generic silhouette. They look
  // nothing alike on purpose - the joke is that they all insist they're
  // siblings anyway, sharing the invented surname "Parente" (literally
  // Portuguese for "relative"). One per corner of the map, per the brief.
  espinho: {
    id: 'espinho',
    name: 'Espinho Parente',
    role: 'Primo do Deserto',
    kind: 'meme',
    skinColor: '#6a9c4a',
    outfitColor: '#6a9c4a',
    hairColor: '#4a7a32',
    portraitSprite: require('../../../assets/legacy-sprites/meme-kin/espinho.png'),
    dialogue: ['Calor que eu curto. É de família.', 'Já falaram que eu não pareço nada com meus parentes. E daí? Somos família igual.'],
  },
  violeta: {
    id: 'violeta',
    name: 'Violeta Parente',
    role: 'Prima das Sombras',
    kind: 'meme',
    skinColor: '#7a4ea8',
    outfitColor: '#7a4ea8',
    hairColor: '#4a2e68',
    portraitSprite: require('../../../assets/legacy-sprites/meme-kin/violeta.png'),
    dialogue: ['Gosto daqui porque quase ninguém passa.', 'Sim, sou prima do Espinho. Não, não sei explicar o parentesco.'],
  },
  gemada: {
    id: 'gemada',
    name: 'Gemada Parente',
    role: 'Prima Caçula',
    kind: 'meme',
    skinColor: '#e08a3c',
    outfitColor: '#e08a3c',
    hairColor: '#c76a1a',
    portraitSprite: require('../../../assets/legacy-sprites/meme-kin/gemada.png'),
    dialogue: ['Vim parar bem longe de casa, hein?', 'A família inteira espalhada pelos cantos do mapa. Reunião de família deve ser caótica.'],
  },
  polen: {
    id: 'polen',
    name: 'Pólen Parente',
    role: 'Prima Voadora',
    kind: 'meme',
    skinColor: '#4ec4c4',
    outfitColor: '#d88ad8',
    hairColor: '#2e8a8a',
    portraitSprite: require('../../../assets/legacy-sprites/meme-kin/polen.png'),
    dialogue: ['Voei o mapa inteiro. Essa ilha é mais misteriosa de perto.', 'Minha prima Gemada nem sabe voar. Família é diversa assim mesmo.'],
  },
  penumbra: {
    id: 'penumbra',
    name: 'Penumbra Parente',
    role: 'Prima do Fim do Mundo',
    kind: 'meme',
    skinColor: '#c8c8d8',
    outfitColor: '#6a3f9c',
    hairColor: '#6a3f9c',
    portraitSprite: require('../../../assets/legacy-sprites/meme-kin/penumbra.png'),
    dialogue: ['Shh. Aqui é tranquilo. Quase ninguém me acha.', 'Família Parente? Sim, infelizmente. Ou felizmente. Depende do dia.'],
  },
  // v3 (earlier pass): "mais npcs memes, como o moai" - moai/Sigma Boy
  // already existed (see below for where it's placed); these are more in
  // that same spirit, playing on a general internet phenomenon rather
  // than any specific franchise character - same reasoning as the header
  // comment above.
  npc_padrao: {
    id: 'npc_padrao',
    sheetChar: 'c14',
    name: 'NPC Padrão',
    role: 'Figurante',
    kind: 'meme',
    skinColor: '#b7b7b7',
    outfitColor: '#8a8a8a',
    hairColor: '#6e6e6e',
    dialogue: ['Olá, viajante.', 'Olá, viajante.', '(Ele parece só saber dizer isso. Talvez seja só isso que exista dele.)'],
  },
  garoto_sombrio: {
    id: 'garoto_sombrio',
    sheetChar: 'c03',
    name: 'Breno das Trevas',
    role: 'Alma Sombria (crachá: "Breno")',
    kind: 'meme',
    skinColor: '#cfa98c',
    outfitColor: '#1a1a1a',
    hairColor: '#0a0a0a',
    dialogue: [
      'A luz não me alcança aqui.',
      '(cochicha) ...na real não tem muita luz em lugar nenhum perto daqui, mas fica mais dramático falando assim.',
      'Não perguntem meu nome verdadeiro. ...tá bom, é Breno.',
    ],
  },
  turista: {
    id: 'turista',
    sheetChar: 'c12',
    name: 'Turista Perdido',
    role: 'De Férias (Será?)',
    kind: 'meme',
    skinColor: '#e0b08c',
    outfitColor: '#ff8a3d',
    hairColor: '#3a2a1a',
    dialogue: [
      'Com licença, esse é o caminho pro "telhado do mundo"? Jurava que vi isso num mapa.',
      'Eu só queria tirar uma foto da ilha misteriosa, mas acho que entrei NA ilha misteriosa.',
      'Se você ver uma van de turismo por aqui, me chama.',
    ],
  },
  toinho: {
    id: 'toinho',
    sheetChar: 'c22',
    name: 'Toinho',
    role: 'Vendedor Ambulante',
    kind: 'friendly',
    skinColor: '#c78e5e',
    outfitColor: '#2a6b4a',
    hairColor: '#2a1a0a',
    dialogue: [
      'Psiu! Não conta pra Marina, mas eu ando achando coisa que nem na loja dela tem.',
      'Compro, vendo, troco... e às vezes só dou de graça se gostar da sua cara.',
    ],
    giftItemId: 'old_coin',
  },
  mercador_noturno: {
    id: 'mercador_noturno',
    sheetChar: 'c16',
    name: 'Mercador da Madrugada',
    role: 'Mercador Misterioso',
    kind: 'meme',
    skinColor: '#c9a98b',
    outfitColor: '#2a2147',
    hairColor: '#1a1a22',
    dialogue: ['Psiu... Eu só apareço quando a lua está alta.', 'Quem anda de dia nunca me vê. Que pena, tenho coisas que o sol não merece.'],
  },
  cantora_chuva: {
    id: 'cantora_chuva',
    sheetChar: 'c19',
    name: 'Dona Garoa',
    role: 'Cantora da Chuva',
    kind: 'friendly',
    skinColor: '#f0cfb0',
    outfitColor: '#5a8fbf',
    hairColor: '#e8e8f2',
    dialogue: ['Só canto quando as nuvens pedem.', 'A chuva lava o dia e deixa as histórias mais bonitas.'],
  },
  pipoca: {
    id: 'pipoca',
    sheetChar: 'c15',
    name: 'Pipoca',
    role: 'Criança da Vila',
    kind: 'friendly',
    skinColor: '#e6b98c',
    outfitColor: '#f2d54c',
    hairColor: '#3a2a1a',
    dialogue: [
      'Uau, você é um lutador de verdade?? Posso ver um soco?',
      'Quando eu crescer quero ser forte que nem o Dogge!',
      'Minha mãe falou pra eu não ir sozinho na floresta. Mas com você, posso?',
    ],
  },
  mestre_guilda: {
    id: 'mestre_guilda',
    sheetChar: 'c01',
    name: 'Mestre Gaspar',
    role: 'Mestre da Guilda',
    kind: 'friendly',
    skinColor: '#d9a37a',
    outfitColor: '#5a2a7a',
    hairColor: '#cfcfcf',
    dialogue: [
      'Bem-vindo à Guilda, aventureiro. Aqui trabalho só entra por boca de quem confia.',
      'Quando tiver um tempo, volte: sempre aparece um recado que ninguém mais pode levar.',
    ],
  },
  eremita: {
    id: 'eremita',
    sheetChar: 'c07',
    name: 'Eremita Tobias',
    role: 'Morador da Caverna',
    kind: 'friendly',
    skinColor: '#c9a27a',
    outfitColor: '#4a4a3a',
    hairColor: '#dcdcdc',
    dialogue: [
      'Faz anos que ninguém desce até aqui. A umidade ajuda a pensar.',
      'Dizem que as galerias de baixo guardam coisa velha. Eu só ouço o eco.',
    ],
  },
};

/** Rival's lines change with quest progress, so a single static array isn't enough. */
export function getRivalDialogue(status: 'unstarted' | 'offered' | 'active' | 'completed'): string[] {
  switch (status) {
    case 'completed':
      return ['Boa luta! Você manda bem de verdade.', 'Da próxima vez eu ganho, só esperar.'];
    case 'active':
    case 'offered':
      return ['E aí, preparado pra revanche?', 'Bora, tô te esperando.'];
    case 'unstarted':
    default:
      return NPCS.rival.dialogue;
  }
}

export function getCaptainDialogue(status: 'unstarted' | 'offered' | 'active' | 'completed'): string[] {
  if (status === 'completed') return ['Perdi... mas a Legião não esquece isso.', 'Vai. Por enquanto, o acampamento é seu de passagem.'];
  if (status === 'active' || status === 'offered') return ['Ainda de pé? Então vamos.', 'Sem mais conversa: luta.'];
  return NPCS.soldier_captain.dialogue;
}

export function getDogkingDialogue(status: 'unstarted' | 'offered' | 'active' | 'completed'): string[] {
  if (status === 'completed') return ['Hmpf. Talvez você mereça o respeito do Dogge, afinal.', 'A ilha continua sendo nossa. Mas hoje, o dia é seu.'];
  if (status === 'active' || status === 'offered') return ['Chegou até aqui. Vamos ver do que é feito.'];
  return NPCS.dogking.dialogue;
}

export function getTankDialogue(status: 'unstarted' | 'offered' | 'active' | 'completed'): string[] {
  if (status === 'completed') return ['...Passa. Mas o Rei vai saber disso.', 'A Ilha das Trevas é sua, por enquanto.'];
  if (status === 'active' || status === 'offered') return ['De novo? Achei que já tinha te ensinado.'];
  return NPCS.tank_vulcao.dialogue;
}

/** Dispatches to the right per-NPC status-dialogue function above, so
 * callers don't need to know which quest NPC they're talking to. */
export function getNpcDialogue(npc: NpcDef, status: 'unstarted' | 'offered' | 'active' | 'completed'): string[] {
  if (npc.id === 'rival') return getRivalDialogue(status);
  if (npc.id === 'soldier_captain') return getCaptainDialogue(status);
  if (npc.id === 'dogking') return getDogkingDialogue(status);
  if (npc.id === 'tank_vulcao') return getTankDialogue(status);
  return npc.dialogue;
}

export interface OutdoorPlacement {
  npcId: string;
  x: number;
  y: number;
  /** NPC secreto: só aparece à noite ('night') ou enquanto chove ('rain'). */
  only?: 'night' | 'rain';
}

export const OUTDOOR_NPCS: OutdoorPlacement[] = [
  { npcId: 'bento', x: PLAZA_SQUARE.x - 8, y: PLAZA_SQUARE.y + 1 },
  { npcId: 'rival', x: PLAZA_SQUARE.x + 8, y: PLAZA_SQUARE.y + 3 },
  { npcId: 'zeca', x: REGION_ANCHORS.dock.x - 7, y: REGION_ANCHORS.dock.y - 2 },
  { npcId: 'iara', x: 661, y: 541 },
  { npcId: 'rocha', x: IGLOO_TILE.x + 10, y: IGLOO_TILE.y + 40 },
  { npcId: 'orc_guard', x: REGION_ANCHORS.camp.x - 40, y: REGION_ANCHORS.camp.y + 20 },
  { npcId: 'soldier_captain', x: REGION_ANCHORS.camp.x, y: REGION_ANCHORS.camp.y - 10 },
  { npcId: 'footman_dog', x: 1166, y: 1277 },
  { npcId: 'tank_dog', x: 1164, y: 1319 },
  { npcId: 'dogking', x: 1264, y: 1299 },
  { npcId: 'silvana', x: 1360, y: 900 },
  { npcId: 'tico', x: REGION_ANCHORS.camp.x, y: REGION_ANCHORS.camp.y + 60 },
  { npcId: 'moai', x: 169, y: 549 },
  { npcId: 'guardiao_pedra', x: CAVE_GUARDIAN_SPOT.x, y: CAVE_GUARDIAN_SPOT.y },
  { npcId: 'tank_vulcao', x: REGION_ANCHORS.vulcao.x + 30, y: REGION_ANCHORS.vulcao.y },
  { npcId: 'npc_padrao', x: PLAZA_SQUARE.x + 12, y: PLAZA_SQUARE.y - 2 },
  { npcId: 'toinho', x: PLAZA_SQUARE.x - 13, y: PLAZA_SQUARE.y + 2 },
  { npcId: 'pipoca', x: PLAZA_SQUARE.x + 3, y: PLAZA_SQUARE.y - 2 },
  { npcId: 'mercador_noturno', x: PLAZA_SQUARE.x - 5, y: PLAZA_SQUARE.y + 4, only: 'night' },
  { npcId: 'cantora_chuva', x: PLAZA_SQUARE.x + 5, y: PLAZA_SQUARE.y + 5, only: 'rain' },
  { npcId: 'garoto_sombrio', x: REGION_ANCHORS.trevas.x + 15, y: REGION_ANCHORS.trevas.y + 10 },
  { npcId: 'turista', x: REGION_ANCHORS.misteriosa.x - 18, y: REGION_ANCHORS.misteriosa.y + 14 },
  // One per corner (see docs/AUDIT.md) - each checked against the real
  // decoded map grid, not just eyeballed from coordinates.
  { npcId: 'espinho', x: 1859, y: 360 }, // near vulcao (east)
  { npcId: 'violeta', x: 104, y: 209 }, // near trevas (northwest)
  { npcId: 'gemada', x: 1675, y: 1065 }, // near fragA (southeast)
  { npcId: 'polen', x: 1151, y: 208 }, // near misteriosa (north)
  { npcId: 'penumbra', x: 187, y: 993 }, // southwest corner
  { npcId: 'alpinista', x: 82, y: 779 }, // at the foot of the icy cliff
  // One ferryman per dock: talking opens the boat menu.
  ...Object.values(FERRY_DOCKS).map((d) => ({ npcId: 'barqueiro', x: d.ferryman.x, y: d.ferryman.y })),
];

// buildingId -> npcId, for NPCs that live inside a specific structure.
export const BUILDING_NPCS: Record<string, string> = {
  plaza_shop: 'marina',
  casa_iracema: 'iracema',
  fire_house_1: 'brasa',
};
