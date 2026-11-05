import { registerSaveExt } from './saveExt';

/**
 * REVANCHE: perdeu uma luta e tentou de novo = está tendo uma segunda chance, então o prêmio daquela luta encolhe.
 *   1ª tentativa ............................ 100% da recompensa
 *   revanche (depois de 1 derrota) .......... 50%  (−50%)
 *   revanche da revanche (2 derrotas ou +) .. 30%  (−70%, e continua −70% nas seguintes)
 * A conta é por luta (chefe, rival, missão de duelo) e zera quando você vence. Só encolhe moedas e XP: itens, bolsas, personagens
 * liberados e o avanço da história continuam inteiros (senão uma derrota poderia travar a história). Torre e VERSUS não entram.
 * Fica salvo no jogo (ext 'revanche'): fechar o app não "limpa" a revanche.
 */
export const REVANCHE_MULTS = [1, 0.5, 0.3] as const;

let losses: Record<string, number> = {};

/** Identidade da luta para a conta de revanche; null = não conta (VERSUS livre, torre). */
export function revancheKey(s: { kind: string; boss?: { id: string }; questId?: string }): string | null {
  if (s.kind === 'boss' && s.boss) return `boss:${s.boss.id}`;
  if (s.kind === 'rival') return 'rival';
  if (s.kind === 'quest' && s.questId) return `quest:${s.questId}`;
  return null;
}

/** Derrotas seguidas nessa luta (desde a última vitória). */
export function revancheLosses(key: string | null): number {
  return key ? losses[key] ?? 0 : 0;
}

/** Multiplicador do prêmio da PRÓXIMA vitória nessa luta. */
export function revancheMult(key: string | null): number {
  const n = revancheLosses(key);
  return REVANCHE_MULTS[Math.min(n, REVANCHE_MULTS.length - 1)];
}

/** Texto curto: '' (sem desconto), '-50%' ou '-70%'. */
export function revancheLabel(mult: number): string {
  return mult >= 1 ? '' : `-${Math.round((1 - mult) * 100)}%`;
}

export function recordLoss(key: string | null) {
  if (key) losses[key] = (losses[key] ?? 0) + 1;
}

export function recordWin(key: string | null) {
  if (key) delete losses[key];
}

/** Aplica o desconto a um prêmio (nunca zera um prêmio positivo). */
export function applyRevanche(amount: number, mult: number): number {
  if (amount <= 0) return 0;
  return Math.max(1, Math.round(amount * mult));
}

registerSaveExt({
  key: 'revanche',
  snapshot: () => ({ losses }),
  restore: (d) => {
    const raw = (d as { losses?: Record<string, unknown> } | undefined)?.losses;
    losses = {};
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && v > 0) losses[k] = Math.floor(v);
    }
  },
  reset: () => {
    losses = {};
  },
});
