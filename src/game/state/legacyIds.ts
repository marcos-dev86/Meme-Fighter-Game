/**
 * Migração de ids antigos. Os 3 "troncos" foram renomeados (Parte 2, rodada 2):
 *   tocao -> sahur      serafim -> sahur_god      capiroto -> sahur_evil
 * Saves e preferências gravados antes disso ainda trazem os ids velhos (personagens liberados, chefes vencidos,
 * missões `tronco_*`, NPCs `*_npc`, itens coletados, chave de revanche `boss:boss_*`...). Como esses ids só existiam
 * para esses 3 personagens, trocar o TEXTO do JSON antes do parse é seguro e cobre todos os campos de uma vez.
 * Puro (sem React/AsyncStorage) para poder ser testado no Node.
 */
const OLD_TO_NEW: [RegExp, string][] = [
  [/tocao/g, 'sahur'],
  [/serafim/g, 'sahur_god'],
  [/capiroto/g, 'sahur_evil'],
];

export function migrateLegacyIds(raw: string): string {
  let out = raw;
  for (const [re, to] of OLD_TO_NEW) out = out.replace(re, to);
  return out;
}

/** Um id solto (ex.: vindo de rota/parâmetro). */
export function migrateLegacyId(id: string): string {
  return migrateLegacyIds(id);
}
