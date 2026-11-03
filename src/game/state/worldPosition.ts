/**
 * Última posição do jogador no mundo (tile, ilha e se está navegando). A
 * WorldScreen atualiza; a batalha lê para escolher o cenário, o clima e a hora
 * do dia de acordo com o lugar onde a luta começou.
 */
export interface WorldPosition {
  tx: number;
  ty: number;
  island: string | null;
  sailing: boolean;
}

let pos: WorldPosition | null = null;

export function setWorldPosition(p: WorldPosition) {
  pos = p;
}

export function getWorldPosition(): WorldPosition | null {
  return pos;
}

export function clearWorldPosition() {
  pos = null;
}
