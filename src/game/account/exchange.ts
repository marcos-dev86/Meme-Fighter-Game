import { addCoins } from '@/game/state/playerState';
import { takeCoinPack } from './accountState';

/**
 * Câmbio: Diamond Meme (da conta) -> Meme Coins do mundo aberto. Só existe esse sentido. As moedas entram sem o bônus da
 * mochila (addCoins com bonus=false), então o pacote vale exatamente o que está escrito. Devolve quantas moedas entraram
 * (0 = saldo de diamantes insuficiente).
 */
export function exchangeForCoins(packId: string): number {
  const coins = takeCoinPack(packId);
  if (coins > 0) addCoins(coins, false);
  return coins;
}
