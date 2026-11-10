import { registerSaveExt } from './saveExt';

/**
 * CHECKPOINT do modo história: o último cais/píer em que o jogador desembarcou (onde as balsas/plataformas de pesca ficam).
 * Perder uma luta de história (ou desmaiar no mundo) leva o jogador de volta para lá, pagando a taxa de derrota.
 * Sem checkpoint ainda (mundo novo) = a vila. Guardado no save (ext 'checkpoint'), em pixels do mundo.
 */
export interface CheckpointPos {
  x: number;
  y: number;
}

let point: CheckpointPos | null = null;
/** A luta de história que acabou em derrota pede ao mundo que leve o jogador ao checkpoint ao voltar (não vai para o save). */
let respawnPending = false;

export function getCheckpoint(): CheckpointPos | null {
  return point;
}
export function setCheckpoint(p: CheckpointPos) {
  if (Number.isFinite(p.x) && Number.isFinite(p.y)) point = { x: Math.round(p.x), y: Math.round(p.y) };
}
export function requestRespawn() {
  respawnPending = true;
}
/** O mundo chama ao ganhar foco: true uma única vez depois de requestRespawn(). */
export function consumeRespawn(): boolean {
  const r = respawnPending;
  respawnPending = false;
  return r;
}

registerSaveExt({
  key: 'checkpoint',
  snapshot: () => ({ point }),
  restore: (d) => {
    const p = (d as { point?: { x?: unknown; y?: unknown } | null } | undefined)?.point;
    point = p && typeof p.x === 'number' && typeof p.y === 'number' ? { x: p.x, y: p.y } : null;
    respawnPending = false;
  },
  reset: () => {
    point = null;
    respawnPending = false;
  },
});
