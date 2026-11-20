/**
 * CRIATURAS MARINHAS do mergulho. Cada uma tem comportamento, atributos, vulnerabilidade/resistência e recompensa próprios
 * (nada de cópias com números diferentes). A arte vem das folhas do pacote (assets/sea/*.png), fatiadas por `sheet`.
 *
 * Categorias:
 *  - hostile: ataca o jogador quando ele chega perto (veneno, emboscada, isca luminosa...).
 *  - neutral: ignora o jogador, mas reage se for atacado ou se for incomodado.
 *  - friendly: ajuda (pistas, itens, cura de status); pode ser ALIMENTADA.
 *  - rare: só aparece em condição específica ou área difícil.
 */
export type CreatureBehavior = 'hostile' | 'neutral' | 'friendly' | 'rare';
/** Golpes do mergulho: leve (rápido) e forte (lento, mais dano). */
export type DiveAttack = 'light' | 'heavy';
/** Padrões dos mini-chefes: varredura (área com sinal), tinta (escurece), invocar filhotes e isca (puxa o jogador). */
export type BossPattern = 'sweep' | 'ink' | 'summon' | 'lure';

export interface SheetDef {
  /** Chave do arquivo em seaAssets.ts. */
  key: string;
  cols: number;
  rows: number;
  /** Quadros usados na animação (índices em leitura por linha). */
  frames: number[];
  /** Tamanho de um quadro na folha, em px. */
  fw: number;
  fh: number;
}

export interface CreatureDef {
  id: string;
  name: string;
  behavior: CreatureBehavior;
  /** Papel para o aviso de morte. */
  role: 'creature' | 'guardian';
  hp: number;
  /** Dano de contato (em fração da vida máxima do jogador, 0,06 = 6%). */
  damageFrac: number;
  /** Velocidade em px/s. */
  speed: number;
  /** Distância (px) em que nota o jogador. */
  aggro: number;
  /** Tamanho na tela (px). */
  size: number;
  /** Intervalo entre danos de contato. */
  hitCooldownMs: number;
  /** Veneno/queimadura aplicado ao tocar (dano ao longo do tempo, cita o responsável na morte). */
  dot?: { kind: 'poison' | 'burn'; ms: number; fracPerSec: number };
  /** Emboscada: fica escondida até o jogador chegar perto. */
  ambush?: boolean;
  /** Casca: alterna entre aberta e fechada; fechada resiste bem a golpes fortes. */
  shell?: boolean;
  /** Sofre mais (weak) ou menos (resist) de um tipo de golpe. */
  weak?: DiveAttack;
  resist?: DiveAttack;
  /** Reage a ser atingida repetidamente (veja `adaptation` no sim): fica mais resistente ao mesmo golpe. */
  learns?: boolean;
  /** Soltar tinta: escurece a tela ao ser atingida. */
  ink?: boolean;
  /** MINI-CHEFE: ciclo de padrões de ataque com sinal visível (círculo de aviso) antes de cada golpe. */
  boss?: { patterns: BossPattern[]; /** raio do golpe em área (px) */ radius: number; /** tempo entre padrões */ everyMs: number };
  /** Condição para aparecer (rara). */
  rareWhen?: 'abyss' | 'night' | 'quest';
  sheet: SheetDef;
  reward: { coins: number; xp: number; items?: Record<string, number> };
  /** Frase ao encontrar (humor, memes). */
  line: string;
  /** Amigável: o que dá ao ser alimentada ou ao conversar. */
  gift?: { itemId: string; qty: number };
}

const S = (key: string, cols: number, rows: number, fw: number, fh: number, frames: number[]): SheetDef => ({ key, cols, rows, fw, fh, frames });

export const CREATURES: Record<string, CreatureDef> = {
  clownfish: {
    id: 'clownfish', name: 'Peixe Palhaço Nemo Jr.', behavior: 'friendly', role: 'creature', hp: 6, damageFrac: 0, speed: 34, aggro: 0, size: 34, hitCooldownMs: 0,
    sheet: S('clownfish', 4, 2, 64, 64, [0, 1, 2, 3]),
    reward: { coins: 0, xp: 5 },
    line: 'Ele aponta com a nadadeira para um baú e pisca duas vezes. Parece que sabe de tudo.',
    gift: { itemId: 'kelp_snack', qty: 1 },
  },
  turtle: {
    id: 'turtle', name: 'Tartaruga Zen', behavior: 'friendly', role: 'creature', hp: 30, damageFrac: 0, speed: 22, aggro: 0, size: 60, hitCooldownMs: 0,
    sheet: S('turtle', 4, 1, 128, 128, [0, 1, 2, 3]),
    reward: { coins: 0, xp: 10 },
    line: 'Ela tem 300 anos e respira devagar. Diz que a pressa é inimiga do fôlego.',
    gift: { itemId: 'bubble_potion', qty: 1 },
  },
  cleaner: {
    id: 'cleaner', name: 'Limpador Dona Branquinha', behavior: 'friendly', role: 'creature', hp: 8, damageFrac: 0, speed: 40, aggro: 0, size: 30, hitCooldownMs: 0,
    sheet: S('cleaner', 4, 3, 32, 32, [0, 1, 2, 3]),
    reward: { coins: 0, xp: 5 },
    line: 'Ela limpa o seu veneno de graça e ainda reclama que você é muito sujo.',
  },
  angel: {
    id: 'angel', name: 'Cardume Anjo Fofoqueiro', behavior: 'neutral', role: 'creature', hp: 10, damageFrac: 0, speed: 50, aggro: 0, size: 36, hitCooldownMs: 0, weak: 'light',
    sheet: S('angel_fish', 4, 2, 64, 64, [0, 1, 2, 3]),
    reward: { coins: 6, xp: 8 },
    line: 'Cochicham sobre você assim que passa. Ninguém sabe o que dizem.',
  },
  anchovy: {
    id: 'anchovy', name: 'Cardume de Anchovas', behavior: 'neutral', role: 'creature', hp: 12, damageFrac: 0, speed: 60, aggro: 0, size: 44, hitCooldownMs: 0,
    sheet: S('banc_anchois', 4, 4, 80, 80, [0, 1, 2, 3]),
    reward: { coins: 4, xp: 6 },
    line: 'Fogem juntas e mudam de direção ao mesmo tempo. Impressionante, e meio ridículo.',
  },
  crab: {
    id: 'crab', name: 'Caranguejo Armadura', behavior: 'neutral', role: 'creature', hp: 26, damageFrac: 0.05, speed: 30, aggro: 70, size: 36, hitCooldownMs: 1400, shell: true, resist: 'heavy', weak: 'light',
    sheet: S('crabe', 1, 2, 64, 64, [0, 1]),
    reward: { coins: 14, xp: 16, items: { coral_shard: 1 } },
    line: 'Fica de boa até você cutucar. Depois vira uma geladeira de pinça.',
  },
  jelly_blue: {
    id: 'jelly_blue', name: 'Água-viva Azulão', behavior: 'neutral', role: 'creature', hp: 14, damageFrac: 0.04, speed: 16, aggro: 0, size: 44, hitCooldownMs: 1200,
    dot: { kind: 'poison', ms: 3000, fracPerSec: 0.012 },
    sheet: S('meduse_bleue', 2, 2, 64, 64, [0, 1, 2]),
    reward: { coins: 8, xp: 10 },
    line: 'Flutua sem rumo. Encostar nela é uma péssima ideia, e todo mundo encosta.',
  },
  moray: {
    id: 'moray', name: 'Moreia Tocaieira', behavior: 'hostile', role: 'creature', hp: 34, damageFrac: 0.09, speed: 120, aggro: 90, size: 56, hitCooldownMs: 1100, ambush: true, weak: 'heavy',
    sheet: S('murene', 4, 3, 128, 64, [0, 1, 2, 3]),
    reward: { coins: 24, xp: 30, items: { sunken_coin: 1 } },
    line: 'Ela estava na toca o tempo todo. Você não viu. Ela viu você.',
  },
  jelly_pink: {
    id: 'jelly_pink', name: 'Água-viva Rosa Venenosa', behavior: 'hostile', role: 'creature', hp: 18, damageFrac: 0.03, speed: 40, aggro: 120, size: 44, hitCooldownMs: 1000,
    dot: { kind: 'poison', ms: 4000, fracPerSec: 0.02 }, weak: 'light',
    sheet: S('meduse_rose', 2, 2, 64, 64, [0, 1, 2]),
    reward: { coins: 16, xp: 22 },
    line: 'Bonita demais para ser inofensiva. O veneno dela faz o fôlego parecer curto.',
  },
  octopus: {
    id: 'octopus', name: 'Polvo Tinteiro', behavior: 'hostile', role: 'creature', hp: 60, damageFrac: 0.07, speed: 70, aggro: 150, size: 68, hitCooldownMs: 1300, ink: true, learns: true,
    sheet: S('pieuvre', 4, 4, 128, 128, [0, 1, 2, 3]),
    reward: { coins: 40, xp: 55, items: { pearl: 1 } },
    line: 'Ele observa como você ataca e, depois de um tempo, já sabe o que vem. Esperto e antipático.',
  },
  angler: {
    id: 'angler', name: 'Tamboril Lanterninha', behavior: 'hostile', role: 'creature', hp: 90, damageFrac: 0.12, speed: 55, aggro: 170, size: 80, hitCooldownMs: 1500, resist: 'light', weak: 'heavy',
    sheet: S('baudroief', 2, 2, 128, 128, [0, 1]),
    reward: { coins: 70, xp: 90, items: { coral_shard: 2 } },
    line: 'Usa a luzinha para atrair curiosos. Funcionou com você.',
  },
  jelly_violet: {
    id: 'jelly_violet', name: 'Água-viva Violeta do Abismo', behavior: 'rare', role: 'creature', hp: 40, damageFrac: 0.05, speed: 28, aggro: 100, size: 52, hitCooldownMs: 1100,
    dot: { kind: 'poison', ms: 5000, fracPerSec: 0.025 }, rareWhen: 'abyss',
    sheet: S('meduse_violette', 2, 2, 64, 64, [0, 1, 2]),
    reward: { coins: 60, xp: 80, items: { pearl: 1 } },
    line: 'Só aparece nas profundezas. Brilha como uma festa que ninguém convidou você.',
  },
  octopus_baby: {
    id: 'octopus_baby', name: 'Filhote de Polvo', behavior: 'hostile', role: 'creature', hp: 16, damageFrac: 0.03, speed: 95, aggro: 220, size: 34, hitCooldownMs: 1100,
    sheet: S('pieuvre', 4, 4, 128, 128, [4, 5, 6, 7]),
    reward: { coins: 6, xp: 8 },
    line: 'Pequeno, rápido e já com a cara feia da mãe.',
  },
  kraken: {
    id: 'kraken', name: 'Dona Tentáculos', behavior: 'hostile', role: 'guardian', hp: 240, damageFrac: 0.08, speed: 52, aggro: 200, size: 130, hitCooldownMs: 1300, ink: true, learns: true,
    boss: { patterns: ['sweep', 'ink', 'summon'], radius: 120, everyMs: 4200 },
    sheet: S('pieuvre', 4, 4, 128, 128, [0, 1, 2, 3]),
    reward: { coins: 320, xp: 420, items: { pearl: 2, diver_elixir: 1 } },
    line: 'A mãe de todos os polvos da fumarola. Ela aprende com você e não gosta de visita.',
  },
  angler_king: {
    id: 'angler_king', name: 'Tamboril Rei Lanterna', behavior: 'hostile', role: 'guardian', hp: 320, damageFrac: 0.11, speed: 46, aggro: 230, size: 140, hitCooldownMs: 1500, resist: 'light', weak: 'heavy',
    boss: { patterns: ['lure', 'sweep'], radius: 130, everyMs: 4800 },
    sheet: S('baudroief', 2, 2, 128, 128, [0, 1]),
    reward: { coins: 520, xp: 640, items: { pearl: 3, air_flask: 2 } },
    line: 'A lanterna dele é a única luz do abismo. Quem segue a luz nunca volta igual.',
  },
  whale: {
    id: 'whale', name: 'Baleia Filósofa Dona Marlene', behavior: 'rare', role: 'creature', hp: 400, damageFrac: 0, speed: 18, aggro: 0, size: 150, hitCooldownMs: 0, rareWhen: 'quest',
    sheet: S('baleine', 4, 3, 496, 256, [0, 1, 2, 3]),
    reward: { coins: 0, xp: 150, items: { whale_song: 1 } },
    line: 'Ela canta uma nota tão grave que o seu fôlego sossega. Pergunta se você já pensou na vida.',
    gift: { itemId: 'diver_elixir', qty: 1 },
  },
};

export const CREATURE_IDS = Object.keys(CREATURES);

/** Multiplicador de dano do golpe contra a criatura (vulnerabilidade 1,5, resistência 0,6). */
export function attackMultVs(def: CreatureDef, attack: DiveAttack, shellClosed = false): number {
  let m = 1;
  if (def.weak === attack) m *= 1.5;
  if (def.resist === attack) m *= 0.6;
  if (def.shell && shellClosed && attack === 'heavy') m *= 0.35; // casca fechada quase não sente o golpe forte
  return m;
}
