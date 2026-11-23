/**
 * Tradução das cutscenes. Cada campanha tem uma tabela { texto em português: [en, es, fr, ja] }. O texto em português é a
 * própria chave, então a cena continua legível mesmo sem tradução. {player} vira o apelido do jogador. PURO (sem React).
 */
import type { Loc } from './codeCutscenes';

export type CutsceneTexts = Record<string, [string, string, string, string]>;

/** Índice da língua na tupla [pt, en, es, fr, ja]. */
const IDX: Record<string, number> = { pt: 0, en: 1, es: 2, fr: 3, ja: 4 };

/** Resolve um texto de cutscene para a língua e o apelido dados. `tables`: todas as tabelas de tradução juntas. */
export function resolveCutsceneText(loc: Loc | undefined, lang: string, player: string, tables: CutsceneTexts): string {
  if (loc === undefined) return '';
  const i = IDX[lang] ?? 0;
  let s: string;
  if (typeof loc === 'string') {
    const tr = i > 0 ? tables[loc] : undefined;
    s = tr ? tr[i - 1] : loc;
  } else {
    s = loc[i] ?? loc[0];
  }
  return s.split('{player}').join(player);
}

/** Todos os textos (em português) usados por uma lista de quadros; serve para checar se faltou tradução. */
export function collectPtTexts(beats: { title?: Loc; subtitle?: Loc; speaker?: Loc; text?: Loc }[]): string[] {
  const out = new Set<string>();
  for (const b of beats) {
    for (const x of [b.title, b.subtitle, b.speaker, b.text]) {
      if (typeof x === 'string' && x.trim() !== '') out.add(x);
    }
  }
  return [...out];
}
