import type { Lang } from './translations';
import { STRINGS_36 } from './strings36';
import { STRINGS_37 } from './strings37';
import { STRINGS_COMBATE } from './stringsCombate';
import { STRINGS_URGENTE2 } from './stringsUrgente2';
import { STRINGS_URGENTE3 } from './stringsUrgente3';
import { STRINGS_ARMADURA } from './stringsArmadura';
import { STRINGS_CONTA } from './stringsConta';
import { STRINGS_CUTSCENES } from './stringsCutscenes';
import { STRINGS_VERSUS } from './stringsVersus';
import { STRINGS_MORTE } from './stringsMorte';
import { STRINGS_MERGULHO } from './stringsMergulho';
import { STRINGS_SEA_BEAST } from './stringsSeaBeast';
import { STRINGS_PROGRESS } from './stringsProgress';
import { STRINGS_RIVAL_ELITE } from './stringsRivalElite';
import { STRINGS_GRAFICOS } from './stringsGraficos';

/** Todos os blocos de textos adicionados depois do translations.ts original, em ordem (os últimos vencem). */
export const EXTRA_STRINGS: Record<Lang, Record<string, string>>[] = [STRINGS_36, STRINGS_37, STRINGS_COMBATE, STRINGS_URGENTE2, STRINGS_URGENTE3, STRINGS_ARMADURA, STRINGS_CONTA, STRINGS_CUTSCENES, STRINGS_VERSUS, STRINGS_MORTE, STRINGS_MERGULHO, STRINGS_SEA_BEAST, STRINGS_PROGRESS, STRINGS_RIVAL_ELITE, STRINGS_GRAFICOS];
