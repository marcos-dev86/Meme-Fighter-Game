// GERADO por tools/import_npc_sheets.py - nao edite a mao (o mapa NPC -> personagem animado fica em assets/npc-walk/MAP.json).
/**
 * Folhas de ANDAR dos NPCs: cada personagem e uma imagem com 3 colunas (passo A, parado, passo B) x 4 linhas
 * (frente, esquerda, direita, costas); cada quadro = 32 x 48 px da arte original, ampliado 4x.
 */
export const NPC_WALK_FRAME = { w: 32, h: 48, scale: 4 };

export const NPC_WALK_SHEETS: Record<string, number> = {
  w1_0: require('../../../assets/npc-walk/w1_0.png'),
  w1_1: require('../../../assets/npc-walk/w1_1.png'),
  w1_2: require('../../../assets/npc-walk/w1_2.png'),
  w1_3: require('../../../assets/npc-walk/w1_3.png'),
  w1_4: require('../../../assets/npc-walk/w1_4.png'),
  w1_5: require('../../../assets/npc-walk/w1_5.png'),
  w1_6: require('../../../assets/npc-walk/w1_6.png'),
  w1_7: require('../../../assets/npc-walk/w1_7.png'),
  w2_0: require('../../../assets/npc-walk/w2_0.png'),
  w2_1: require('../../../assets/npc-walk/w2_1.png'),
  w2_2: require('../../../assets/npc-walk/w2_2.png'),
  w2_3: require('../../../assets/npc-walk/w2_3.png'),
  w2_4: require('../../../assets/npc-walk/w2_4.png'),
  w2_5: require('../../../assets/npc-walk/w2_5.png'),
  w2_6: require('../../../assets/npc-walk/w2_6.png'),
  w2_7: require('../../../assets/npc-walk/w2_7.png'),
  w3_0: require('../../../assets/npc-walk/w3_0.png'),
  w3_1: require('../../../assets/npc-walk/w3_1.png'),
  w3_2: require('../../../assets/npc-walk/w3_2.png'),
  w3_3: require('../../../assets/npc-walk/w3_3.png'),
  w3_4: require('../../../assets/npc-walk/w3_4.png'),
  w3_5: require('../../../assets/npc-walk/w3_5.png'),
  w3_6: require('../../../assets/npc-walk/w3_6.png'),
  w3_7: require('../../../assets/npc-walk/w3_7.png'),
  w4_0: require('../../../assets/npc-walk/w4_0.png'),
  w4_1: require('../../../assets/npc-walk/w4_1.png'),
  w4_2: require('../../../assets/npc-walk/w4_2.png'),
  w4_3: require('../../../assets/npc-walk/w4_3.png'),
  w4_4: require('../../../assets/npc-walk/w4_4.png'),
  w4_5: require('../../../assets/npc-walk/w4_5.png'),
  w4_6: require('../../../assets/npc-walk/w4_6.png'),
  w4_7: require('../../../assets/npc-walk/w4_7.png'),
};

/** NPC do pacote antigo (npcs.ts: sheetChar) -> personagem animado. */
export const NPC_WALK_FOR: Record<string, string> = {
  c08: 'w4_0',
  c09: 'w4_1',
  c10: 'w4_2',
  c11: 'w4_3',
  c12: 'w4_4',
  c13: 'w4_5',
  c14: 'w4_6',
  c15: 'w4_7',
};
