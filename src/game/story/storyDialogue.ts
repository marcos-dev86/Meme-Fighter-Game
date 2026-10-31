import { getChoice, hasFlag } from '@/game/state/storyFlags';

/**
 * Falas dos NPCs que MUDAM conforme as escolhas da história. A primeira regra cuja condição vale
 * substitui a fala normal do NPC (menos quando uma missão em cadeia está esperando por ele).
 */
interface Rule {
  when: () => boolean;
  lines: string[];
}

const RULES: Record<string, Rule[]> = {
  bento: [
    { when: () => hasFlag('stone_absorbed'), lines: ['Você carrega algo que não devia carregar, meu jovem. Cuidado: o poder não pergunta se você aguenta.'] },
    { when: () => hasFlag('stone_restored'), lines: ['Sinto as ilhas respirarem diferente. Você fez bem em devolver o que foi perdido.'] },
    { when: () => hasFlag('stone_kept'), lines: ['Um troféu na estante... Espero que ele nunca precise ser usado.'] },
    { when: () => hasFlag('bento_union'), lines: ['Como vai, protetor da vila? Esse seu jeito me faz lembrar de alguém...'] },
    { when: () => hasFlag('bento_glory'), lines: ['Já ouvi dizer que o futuro campeão anda arrasando por aí. Continue assim!'] },
  ],
  rival: [
    { when: () => hasFlag('rival_ally'), lines: ['Aliados! Quando você quiser treinar, é só chamar. Mas não pense que vou pegar leve na revanche.'] },
    { when: () => hasFlag('rival_robbed'), lines: ['...', '(Gadigago desvia o olhar e não diz nada.)'] },
    { when: () => hasFlag('rival_taunted'), lines: ['Sorte, é? Daqui a pouco eu mostro quem é sorte e quem é talento.'] },
  ],
  toinho: [
    { when: () => hasFlag('bag_returned'), lines: ['Sabia que eu tinha perdido a bolsinha?! Alguém devolveu. Que alívio! Tome um desconto de amigo, rs.'] },
    { when: () => hasFlag('bag_kept'), lines: ['Perdi uma bolsinha com moedas... Se você vir alguma coisa, me avise, tá?'] },
  ],
  pipoca: [
    { when: () => hasFlag('bag_returned'), lines: ['Eu contei pra praça toda como você devolveu a bolsa. Todo mundo está falando bem de você!'] },
    { when: () => hasFlag('bag_kept'), lines: ['Psiu... nosso segredinho, hein? Boca de siri!'] },
  ],
  croupier: [
    { when: () => hasFlag('lucky_charm'), lines: ['Que bom ver o portador do amuleto! A sorte está do seu lado... por enquanto.'] },
    { when: () => hasFlag('charm_refused'), lines: ['Um jogador que recusa a sorte e ainda joga. Respeito, jovem.'] },
  ],
  soldier_captain: [
    { when: () => hasFlag('ferro_spared'), lines: ['Estou reconstruindo minha vida longe da Legião. Se precisar de algo, estou em dívida com você.'] },
    { when: () => hasFlag('camp_taken'), lines: ['Sim, senhor! O acampamento é seu, senhor!'] },
    { when: () => hasFlag('camp_looted'), lines: ['...', '(O Capitão não olha nos seus olhos.)'] },
  ],
  dogking: [
    { when: () => hasFlag('king_forgiven'), lines: ['A paz entre as ilhas se deve a você. Os cães não esquecerão.'] },
    { when: () => hasFlag('king_champion'), lines: ['Salve o Campeão dos Cães! O trono sempre tem um lugar para você.'] },
    { when: () => hasFlag('king_tribute'), lines: ['Já paguei o que devia. Não me peça mais nada.'] },
  ],
  brasa: [
    { when: () => hasFlag('forged_shield'), lines: ['O escudo que forjei já deve estar protegendo muita gente. Obrigado pela confiança.'] },
    { when: () => hasFlag('forged_blade'), lines: ['A lâmina ainda está quente? Cuide bem dela. Ela é teimosa.'] },
  ],
  garoto_sombrio: [
    { when: () => hasFlag('breno_helped'), lines: ['Eu vi a luz de novo por sua causa. Obrigado, de verdade.'] },
    { when: () => hasFlag('breno_left'), lines: ['Cada um no seu caminho. Foi o que você disse.'] },
    { when: () => hasFlag('breno_bait'), lines: ['Você sumiu, e eu fiquei com uns arranhões... ainda não entendi o que aconteceu.'] },
  ],
  moai: [
    { when: () => getChoice('sigma_statue') === 'glory', lines: ['(A estátua de Sigma Boy parece te acompanhar com os olhos. Você rejeitou o presente, e ela respeita isso.)'] },
    { when: () => getChoice('sigma_statue') === 'power', lines: ['(Sigma Boy permanece em silêncio. O que ele tinha para te dar, você já levou.)'] },
    { when: () => getChoice('sigma_statue') === 'union', lines: ['(Sigma Boy permanece em silêncio. A sabedoria que ele te deu continua com você.)'] },
  ],
};

/** Falas que a história pede para esse NPC agora (ou null para usar as normais). */
export function storyLinesFor(npcId: string): string[] | null {
  const rule = RULES[npcId]?.find((r) => r.when());
  return rule ? rule.lines : null;
}
