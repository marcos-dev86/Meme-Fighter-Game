import { DEATH, deathFee } from './accountConfig';
import { chargeCoins, getCoins, getLevel } from '@/game/state/playerState';
import { getStoryDifficulty } from '@/game/state/difficulty';
import { noteDeath, noteRevive, spendDiamonds } from './accountState';

/**
 * Regras de morte da história (as contas estão em accountConfig.ts):
 *  - perder paga uma taxa em Meme Coins, que PODE deixar o saldo negativo;
 *  - reviver custa Diamond Meme e devolve 100% da vida no mesmo estado (lugar, luta, rounds, energia).
 */
export function currentDeathFee(): number {
  return deathFee(getLevel(), getStoryDifficulty());
}

/** Cobra a taxa de derrota. Devolve o valor cobrado e o saldo de Meme Coins depois. */
export function payDeathFee(): { fee: number; balance: number } {
  const fee = currentDeathFee();
  chargeCoins(fee);
  const balance = getCoins();
  noteDeath(balance < 0);
  return { fee, balance };
}

/** Tenta reviver com diamantes. false = saldo insuficiente (nada é cobrado). */
export function payRevive(): boolean {
  if (!spendDiamonds(DEATH.reviveDiamonds)) return false;
  noteRevive();
  return true;
}

export const REVIVE_COST = DEATH.reviveDiamonds;
