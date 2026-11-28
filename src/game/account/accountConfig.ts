/**
 * VALORES AJUSTÁVEIS da conta (Diamond Meme, morte, câmbio, perfil). Tudo que é número de balanceamento mora aqui, em um
 * arquivo PURO (sem React nem AsyncStorage): mude um valor e o jogo inteiro (e os testes) acompanha.
 */
import type { Difficulty } from '@/game/state/difficulty';
import type { Rarity } from '@/game/items/rarity';

/** Quanto cada fonte rende em Diamond Meme. */
export const DIAMOND_RATES = {
  /** missão da história concluída */
  mission: 1,
  /** missão FINAL (zerar o modo história) */
  finalMission: 10,
  /** 1ª vez que derrota um chefe do mundo (revanche não rende) */
  bossFirst: 3,
  /** Torre: andar NOVO (acima do melhor andar já alcançado) / andar múltiplo de 5 / andar de chefe (múltiplo de 10) */
  towerFloor: 1,
  towerFloor5: 3,
  towerFloorBoss: 5,
  /** VERSUS contra a CPU: por vitória, conforme a dificuldade (contra pessoa/treino não rende) */
  versusWin: { beginner: 1, easy: 1, medium: 2, hard: 3, hardcore: 5 } as Record<Difficulty, number>,
  /** teto diário de diamantes vindos do VERSUS (impede farmar lutas rápidas) */
  versusDailyCap: 30,
  /** desbloquear uma conquista, por raridade */
  achievement: { common: 1, uncommon: 2, rare: 5, epic: 10, legendary: 25, secret: 50 } as Record<Rarity, number>,
};

/** Morte no mundo/luta de história. */
export const DEATH = {
  /** taxa em Meme Coins = base + level × perLevel, vezes o multiplicador da dificuldade. Pode deixar o saldo NEGATIVO. */
  feeBase: 25,
  feePerLevel: 5,
  feeMult: { beginner: 0.5, easy: 0.75, medium: 1, hard: 1.5, hardcore: 2 } as Record<Difficulty, number>,
  /** custo em Diamond Meme para reviver na hora (volta a lutar com 100% de vida, no mesmo estado) */
  reviveDiamonds: 3,
};

export function deathFee(level: number, difficulty: Difficulty): number {
  const raw = (DEATH.feeBase + Math.max(1, level) * DEATH.feePerLevel) * (DEATH.feeMult[difficulty] ?? 1);
  return Math.max(1, Math.round(raw));
}

/** Câmbio Diamond Meme → Meme Coins (somente compra de moedas; não existe o caminho inverso). */
export interface CoinPack {
  id: string;
  diamonds: number;
  coins: number;
}
export const COIN_PACKS: CoinPack[] = [
  { id: 'pack_1', diamonds: 1, coins: 100 },
  { id: 'pack_5', diamonds: 5, coins: 550 },
  { id: 'pack_20', diamonds: 20, coins: 2400 },
];

/** Preços do perfil, em Diamond Meme. */
export const PROFILE_PRICES = {
  /** Preço base de cada ícone vem de avatarList.ts (gerado por tools/make_avatars.py, tabela SPECS). Para mudar o preço de um
   *  ícone sem regerar nada, ponha o id aqui: avatarOverride: { npc_azulao: 30 }. */
  avatarOverride: {} as Record<string, number>,
  /** fundos com efeito/animação */
  background: { common: 10, uncommon: 20, rare: 35, epic: 60, legendary: 100, secret: 200 } as Record<Rarity, number>,
  frame: { common: 10, uncommon: 20, rare: 35, epic: 60, legendary: 100, secret: 200 } as Record<Rarity, number>,
};

/**
 * SLOTS DE MUNDO EXTRAS (comprados com Diamond Meme, valem para a CONTA inteira). Todo jogador começa com `base` slots grátis;
 * cada slot extra custa o próximo preço da lista (100 a 150). Para mudar o balanceamento mexa só aqui.
 */
export const SLOT_SHOP = {
  base: 3,
  /** preço de cada compra, na ordem; o tamanho da lista é o máximo de slots extras */
  prices: [100, 125, 150, 150, 150, 150] as readonly number[],
};
export const MAX_EXTRA_SLOTS = SLOT_SHOP.prices.length;
export const MAX_SLOTS = SLOT_SHOP.base + MAX_EXTRA_SLOTS;

export const NICK_MAX = 14;
