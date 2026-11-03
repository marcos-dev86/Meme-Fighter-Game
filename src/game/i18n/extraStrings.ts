import type { Lang } from './translations';
import { STRINGS_36 } from './strings36';
import { STRINGS_37 } from './strings37';
import { STRINGS_COMBATE } from './stringsCombate';
import { STRINGS_URGENTE2 } from './stringsUrgente2';

/** Todos os blocos de textos adicionados depois do translations.ts original, em ordem (os últimos vencem). */
export const EXTRA_STRINGS: Record<Lang, Record<string, string>>[] = [STRINGS_36, STRINGS_37, STRINGS_COMBATE, STRINGS_URGENTE2];
