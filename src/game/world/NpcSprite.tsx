import React from 'react';
import { Image, View } from 'react-native';
import { NPC_SHEET } from './npcSheet';
import { NPC_WALK_FOR, NPC_WALK_FRAME, NPC_WALK_SHEETS } from './npcWalk';
import type { NpcFacing } from './npcRoutine';

/** One original sheet pixel -> this many screen px (a 48px-tall character ends up ~62px tall). */
const UNIT = 1.3;

/** Linha da folha de andar para cada direção (frente, esquerda, direita, costas). */
const ROW: Record<NpcFacing, number> = { down: 0, left: 1, right: 2, up: 3 };
/** Colunas da folha: 0 = passo A, 1 = PARADO, 2 = passo B. O ciclo de andar é A, parado, B, parado. */
const WALK_CYCLE = [0, 1, 2, 1];

export interface NpcWalkState {
  facing: NpcFacing;
  walking: boolean;
  /** contador que sobe com o tempo (a tela troca de quadro ao incrementar) */
  frame: number;
}

/** Esse personagem do pacote tem folha de andar (assets/npc-walk)? Se não, segue a imagem parada de sempre. */
export function hasWalkSheet(char: string): boolean {
  const id = NPC_WALK_FOR[char];
  return !!id && NPC_WALK_SHEETS[id] !== undefined;
}

/**
 * A character from the user's sprite pack. Parado = a imagem de sempre (tamanho pela arte original); quando existe folha
 * de andar para ele, desenha o quadro certo (direção + passo) e anda de verdade; sem folha cai na imagem parada.
 */
export function NpcSprite({ char, scale = 1, walk }: { char: string; scale?: number; walk?: NpcWalkState }) {
  const c = NPC_SHEET[char];
  const sheetId = NPC_WALK_FOR[char];
  const sheet = sheetId ? NPC_WALK_SHEETS[sheetId] : undefined;
  if (sheet !== undefined) {
    const fw = NPC_WALK_FRAME.w * UNIT * scale;
    const fh = NPC_WALK_FRAME.h * UNIT * scale;
    const facing = walk?.facing ?? 'down';
    const col = walk?.walking ? WALK_CYCLE[walk.frame % WALK_CYCLE.length] : 1;
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: fw, height: fh, overflow: 'hidden' }}>
          <Image source={sheet} resizeMode="stretch" style={{ position: 'absolute', width: fw * 3, height: fh * 4, left: -col * fw, top: -ROW[facing] * fh }} />
        </View>
      </View>
    );
  }
  if (!c) return null;
  return (
    <View style={{ alignItems: 'center' }}>
      <Image source={c.src} resizeMode="contain" style={{ width: c.w * UNIT * scale, height: c.h * UNIT * scale }} />
    </View>
  );
}
