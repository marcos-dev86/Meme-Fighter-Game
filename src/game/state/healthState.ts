import { registerSaveExt } from './saveExt';

/**
 * VIDA DO MODO HISTÓRIA (mundo <-> luta).
 * Guardada como FRAÇÃO (0..1) da vida máxima, não como número absoluto: o personagem da história pode mudar de vida
 * máxima (upgrades, nível), e a fração continua valendo.
 *
 *  - O mundo escreve a vida a cada quadro (WorldScreen) e lê ao montar / ao voltar de uma luta.
 *  - Luta de HISTÓRIA (missão de duelo, chefe, rival) começa com ESSA vida e, ao terminar, devolve a vida em que o jogador
 *    saiu dela (storyHpAfterFight). Luta rápida (free), VERSUS e Torre NÃO mexem: elas têm a própria vida.
 *  - Perdeu a luta (vida 0): volta ao mundo com DEFEAT_FLOOR (25%), para a derrota não travar a história. Isso é uma
 *    decisão de design, ajuste a constante se quiser mais punição.
 *  - Desmaiar no mundo (vida 0 por inimigos do mapa) acorda na vila com FAINT_HP (50%).
 *  - Cura: itens (poções/comida, também no mundo) e armaduras com regeneração (items/armorDefs.ts).
 * Fica salvo no jogo (ext 'storyHp'); saves antigos sem esse campo começam com a vida cheia.
 */
export const DEFEAT_FLOOR = 0.25;
export const FAINT_HP = 0.5;

let hp = 1;

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1);

export function getStoryHp(): number {
  return hp;
}

export function setStoryHp(frac: number) {
  hp = clamp01(frac);
}

/** Vida (fração) com que o jogador volta ao mundo depois de uma luta de história. */
export function storyHpAfterFight(finalFrac: number): number {
  const f = clamp01(finalFrac);
  return f <= 0 ? DEFEAT_FLOOR : Math.max(0.01, f);
}

/** Lutas que usam a vida da história. */
export function usesStoryHp(kind: string): boolean {
  return kind === 'quest' || kind === 'boss' || kind === 'rival';
}

registerSaveExt({
  key: 'storyHp',
  snapshot: () => ({ hp }),
  restore: (d) => {
    const v = (d as { hp?: unknown } | undefined)?.hp;
    hp = typeof v === 'number' ? Math.max(0.01, clamp01(v)) : 1;
  },
  reset: () => {
    hp = 1;
  },
});
