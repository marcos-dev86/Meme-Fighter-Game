/**
 * Escalada: qual cutscene curta tocar quando o jogador ENTRA num paredão ('cliff').
 * Puro (sem RN) para teste em Node.
 *
 * Regra: quando o jogador passa de FORA do paredão para DENTRO dele, medimos a faixa vertical contínua de tiles 'cliff'
 * da coluna em que entrou (topo..base). Entrou da metade de BAIXO (na base) = 'sobe'; entrou da metade de CIMA (pelo topo) = 'desce'.
 * Sair do paredão (chegar ao topo ou terminar a descida) não toca nada. Montanha: tile com tx > 1700 é o vulcão (mesma regra do
 * TileMapRenderer, que pinta a parede escura); senão é a montanha de neve da Ilha Gelada.
 */
export const VOLCANO_MIN_TX = 1700;
/** Tempo mínimo entre duas cutscenes de escalada (evita repetir ao oscilar na borda do paredão). */
export const CLIMB_COOLDOWN_MS = 15000;
const SCAN_LIMIT = 120;

export type CliffTileGetter = (tx: number, ty: number) => string;

export function cliffSpan(getTile: CliffTileGetter, tx: number, ty: number): { top: number; bottom: number } {
  let top = ty;
  let bottom = ty;
  for (let i = 0; i < SCAN_LIMIT && getTile(tx, top - 1) === 'cliff'; i++) top -= 1;
  for (let i = 0; i < SCAN_LIMIT && getTile(tx, bottom + 1) === 'cliff'; i++) bottom += 1;
  return { top, bottom };
}

/** Evento ('climb:montanha:sobe' ...) para quem acabou de pisar no tile de paredão (tx, ty). */
export function climbEventOnEntry(getTile: CliffTileGetter, tx: number, ty: number): string {
  const { top, bottom } = cliffSpan(getTile, tx, ty);
  const dir = ty >= (top + bottom) / 2 ? 'sobe' : 'desce';
  return `climb:${tx > VOLCANO_MIN_TX ? 'vulcao' : 'montanha'}:${dir}`;
}
