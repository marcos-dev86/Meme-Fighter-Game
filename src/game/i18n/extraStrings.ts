import type { Lang } from './translations';
import { STRINGS_36 } from './strings36';
import { STRINGS_37 } from './strings37';

/** Todos os blocos de textos adicionados depois do translations.ts original, em ordem (os últimos vencem). */
export const EXTRA_STRINGS: Record<Lang, Record<string, string>>[] = [STRINGS_36, STRINGS_37];
