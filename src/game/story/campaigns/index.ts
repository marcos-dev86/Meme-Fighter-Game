import type { CodeCutscene } from '../codeCutscenes';
import type { CutsceneTexts } from '../cutsceneText';
import { DOGGE_CUTSCENES } from './doggeCutscenes';
import { DOGGE_EXTRA_CUTSCENES, DOGGE_EXTRA_TEXTS } from './doggeExtraCutscenes';
import { DOGGE_TEXTS } from './doggeTexts';
import { CAMPAIGNS } from './registry';

/** Todas as cutscenes em código, por id. Cada campanha nova acrescenta as suas aqui. */
const ALL: CodeCutscene[] = [...DOGGE_EXTRA_CUTSCENES, ...DOGGE_CUTSCENES, ...Object.values(CAMPAIGNS).flatMap((c) => c.cutscenes)];

export const CODE_CUTSCENES: Record<string, CodeCutscene> = Object.fromEntries(ALL.map((c) => [c.id, c]));

/** Todas as traduções de cutscenes juntas (chave = texto em português). */
export const CUTSCENE_TEXTS: CutsceneTexts = { ...DOGGE_TEXTS, ...DOGGE_EXTRA_TEXTS };
