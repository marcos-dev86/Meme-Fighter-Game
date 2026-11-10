import { registerSaveExt } from './saveExt';

/** Elites já derrotados neste mundo (o prêmio da 1ª vitória só sai uma vez). Fica na ext 'elites' do save. */
let defeated = new Set<string>();

export function isEliteDefeated(id: string): boolean {
  return defeated.has(id);
}
export function eliteDefeatedCount(): number {
  return defeated.size;
}
/** true na 1ª vez. */
export function markEliteDefeated(id: string): boolean {
  if (defeated.has(id)) return false;
  defeated = new Set(defeated).add(id);
  return true;
}

registerSaveExt({
  key: 'elites',
  snapshot: () => ({ defeated: [...defeated] }),
  // Saves antigos não têm a chave: nenhum elite derrotado (padrão seguro).
  restore: (d) => {
    const arr = (d as { defeated?: unknown } | undefined)?.defeated;
    defeated = new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []);
  },
  reset: () => {
    defeated = new Set();
  },
});
