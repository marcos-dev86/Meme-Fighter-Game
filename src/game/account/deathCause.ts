/**
 * CAUSA DA MORTE: de quem ou do quê o jogador morreu, para a tela de derrota dizer isso em vez de "Você perdeu".
 *
 * Como funciona (extensível, sem mexer na interface):
 *  1. Toda fonte de dano (inimigo do mundo, luta, afogamento, perigo do cenário) chama `noteDamage(causa)` ao ferir.
 *     A ÚLTIMA causa registrada é a causa final: nada é inventado, e se vários feriram, vale o golpe que matou.
 *  2. Ao zerar a vida, a tela chama `describeDeath(causa, t)` e mostra o texto pronto.
 *  3. Fonte nova (chefe, região, perigo) só precisa montar um `DeathCause`; os textos são os de `death_*` em i18n.
 * Módulo puro: sem React nem armazenamento, para testar no Node e para uma futura sincronização multiplayer.
 */

/** Relação da entidade com o jogador (não é parentesco familiar). */
export type EntityRole = 'boss' | 'rival' | 'enemy' | 'creature' | 'guardian';
export const ENTITY_ROLES: EntityRole[] = ['boss', 'rival', 'enemy', 'creature', 'guardian'];

/** Perigos do cenário. */
export type Hazard = 'drowning' | 'breath' | 'fire' | 'lava' | 'fall' | 'poison' | 'trap' | 'cold' | 'pressure' | 'other';
export const HAZARDS: Hazard[] = ['drowning', 'breath', 'fire', 'lava', 'fall', 'poison', 'trap', 'cold', 'pressure', 'other'];

/** Status que pode ter dado o golpe final de uma entidade (dano ao longo do tempo). */
export type DotVia = 'poison' | 'burn';

export type DeathCause =
  | { kind: 'entity'; role: EntityRole; name: string; via?: DotVia }
  | { kind: 'hazard'; hazard: Hazard; /** nome da região já traduzido, se souber */ region?: string };

type T = (key: string) => string;

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/** Texto da morte, na língua do jogador. `null` = nenhuma causa conhecida (aí vale o aviso genérico de derrota). */
export function describeDeath(cause: DeathCause | null | undefined, t: T): string | null {
  if (!cause) return null;
  if (cause.kind === 'entity') {
    const name = cause.name.trim();
    if (!name) return null; // sem nome real não dá para citar ninguém: melhor o aviso genérico que "Inimigo"
    if (cause.via) return fill(t(cause.via === 'poison' ? 'death_via_poison' : 'death_via_burn'), { role: t(`death_role_${cause.role}`), name });
    return fill(t(`death_hit_${cause.role}`), { name });
  }
  if (cause.region && cause.region.trim()) return fill(t('death_explore'), { region: cause.region.trim(), cause: t(`death_cause_${cause.hazard}`) });
  return t(`death_hz_${cause.hazard}`);
}

/** Chave curta para as estatísticas da conta (`deaths_<chave>`). */
export function deathStatKey(cause: DeathCause | null | undefined): string {
  if (!cause) return 'unknown';
  return cause.kind === 'entity' ? cause.role : cause.hazard;
}

// ---- Última causa de dano registrada (estado da sessão, não vai para o save) ----
let last: DeathCause | null = null;

/** Registra quem/o quê acabou de ferir o jogador. A mais recente vence. */
export function noteDamage(cause: DeathCause): void {
  last = cause;
}
export function lastDamageCause(): DeathCause | null {
  return last;
}
/** Chamar ao reviver/acordar, para uma causa velha não vazar para a próxima derrota. */
export function clearDamageCause(): void {
  last = null;
}
