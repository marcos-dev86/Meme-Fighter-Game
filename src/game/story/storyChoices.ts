import { getQuestStatus } from '@/game/state/questState';
import { addCoins, addItem, addStatPoints, addXp } from '@/game/state/playerState';
import { getChoice, makeChoice, setFlag, getChoices } from '@/game/state/storyFlags';
import { itemName } from '@/game/items/itemDefs';

/**
 * As 10 ESCOLHAS IMPORTANTES da história (Parte 38). Cada uma é um diálogo com um NPC: depois de uma fala,
 * o jogador escolhe uma opção, vê o que acontece, recebe a consequência (item, moedas, bandeira) e soma pontos
 * para um dos três finais: União (u), Glória (g) ou Poder (p). Cada escolha só acontece uma vez por save.
 * O texto é de história (como o resto dos diálogos dos NPCs).
 */
export interface Pts {
  u?: number;
  g?: number;
  p?: number;
}
export interface ChoiceOption {
  id: string;
  label: string;
  pts: Pts;
  /** O que o NPC (ou a cena) diz depois da escolha. */
  lines: string[];
  coins?: number;
  items?: Record<string, number>;
  statPoints?: number;
  xp?: number;
  /** Bandeiras extras que mudam falas de NPCs e liberam missões. */
  flags?: string[];
}
export interface ChoiceDef {
  id: string;
  npcId: string;
  /** Quando a escolha aparece (além de ainda não ter sido feita). */
  available: () => boolean;
  intro: string[];
  options: ChoiceOption[];
}

const done = (m: string) => getQuestStatus(m) === 'completed';

export const STORY_CHOICES: ChoiceDef[] = [
  {
    id: 'bento_motive',
    npcId: 'bento',
    available: () => true,
    intro: ['Antes de sair por aí, me diga uma coisa, meu jovem.', 'O mundo é grande e as ilhas estão partidas. Por que você quer lutar?'],
    options: [
      { id: 'glory', label: 'Quero ser o campeão.', pts: { g: 2 }, lines: ['Ha! Ambição é um bom combustível. Tome esta Poção de Fúria: campeões precisam de entrada triunfal.'], items: { power_brew: 1 }, flags: ['bento_glory'] },
      { id: 'union', label: 'Quero proteger a vila.', pts: { u: 2 }, lines: ['Esse é o coração de um verdadeiro lutador. Leve esta Poção de Guarda: ela protege quem protege os outros.'], items: { potion_guard: 1 }, flags: ['bento_union'] },
      { id: 'power', label: 'Quero o tesouro.', pts: { p: 2 }, lines: ['Hum. Sinceridade também é uma virtude... Aqui, uns trocados. Mas cuidado: tesouros costumam cobrar caro.'], coins: 60, flags: ['bento_power'] },
    ],
  },
  {
    id: 'rival_peace',
    npcId: 'rival',
    available: () => done('rival_battle'),
    intro: ['*Gadigago ofega, mas sorri.*', 'Você é bom... Melhor do que eu esperava. E agora, o que vai fazer comigo?'],
    options: [
      { id: 'union', label: 'Apertar a mão dele.', pts: { u: 2 }, lines: ['Gadigago aperta sua mão com firmeza. "Então somos aliados. Pega isto: eu nunca dou nada de graça, entenda como um começo."'], items: { potion_hp_l: 1 }, flags: ['rival_ally'] },
      { id: 'glory', label: 'Provocar: "Foi sorte sua não ter perdido de vez."', pts: { g: 2 }, lines: ['"Sorte?! Na revanche você engole essas palavras!" Gadigago bufa, mas você percebe que ele passou a te respeitar.'], flags: ['rival_taunted'] },
      { id: 'power', label: 'Zombar e levar o prêmio dele.', pts: { p: 2 }, lines: ['Você pega as moedas do bolso dele. Gadigago fica em silêncio. Isso não será esquecido.'], coins: 80, flags: ['rival_robbed'] },
    ],
  },
  {
    id: 'gossip_bag',
    npcId: 'pipoca',
    available: () => done('plaza_gossip'),
    intro: ['Psiu! Achei uma bolsinha caída perto do mercado, com um monte de moedas.', 'Tem cara de ser do Toinho. O que você acha que a gente deve fazer?'],
    options: [
      { id: 'union', label: 'Devolver para o Toinho.', pts: { u: 2 }, lines: ['"Tá certo!" Pipoca sorri. "Vou contar pra praça inteira que você tem bom coração."'], flags: ['bag_returned'] },
      { id: 'power', label: 'Ficar com as moedas.', pts: { p: 2 }, lines: ['Pipoca hesita, mas divide as moedas com você. "Ninguém precisa saber... né?"'], coins: 100, flags: ['bag_kept'] },
    ],
  },
  {
    id: 'croupier_charm',
    npcId: 'croupier',
    available: () => done('casino_lucky'),
    intro: ['Vejo que a sorte gosta de você, jovem.', 'Tenho uma ficha especial: dizem que a casa nunca ganha de quem a carrega. Quer?'],
    options: [
      { id: 'power', label: 'Aceitar a ficha.', pts: { p: 2 }, lines: ['O Crupiê sorri de um jeito estranho. "Perfeito. A sorte também tem um preço, mas isso fica pra depois."'], items: { meme_token: 1 }, coins: 40, flags: ['lucky_charm'] },
      { id: 'union', label: 'Recusar: sorte a gente constrói.', pts: { u: 2 }, lines: ['"Hm... raro. A maioria aceita sem pensar." O Crupiê guarda a ficha e te serve uma poção de energia de cortesia.'], items: { energy_shard: 1 }, flags: ['charm_refused'] },
    ],
  },
  {
    id: 'camp_ferro',
    npcId: 'soldier_captain',
    available: () => done('camp_showdown'),
    intro: ['*O Capitão Ferro está de joelhos, sem a armadura.*', 'Você venceu. A Legião Cinzenta está acabada... faça o que quiser comigo.'],
    options: [
      { id: 'union', label: 'Poupar e deixá-lo ir.', pts: { u: 2 }, lines: ['"Honra... eu devo isso a você." O Capitão deixa sua bandeira com você e vai embora, de cabeça baixa.'], items: { w_bomb: 2 }, flags: ['ferro_spared'] },
      { id: 'glory', label: 'Tomar o acampamento para você.', pts: { g: 2 }, lines: ['A Legião se curva à sua vitória. O acampamento agora tem a sua bandeira.'], coins: 120, flags: ['camp_taken'] },
      { id: 'power', label: 'Humilhá-lo e levar todo o butim.', pts: { p: 2 }, lines: ['Você esvazia o baú da Legião sem piedade. O Capitão nem levanta o olhar.'], coins: 200, flags: ['camp_looted'] },
    ],
  },
  {
    id: 'dogking_end',
    npcId: 'dogking',
    available: () => done('island_boss'),
    intro: ['*O Rei dos Cães respira fundo.*', 'Perdi. Não esperava que um forasteiro tivesse sangue de campeão... Que destino darei a esta coroa?'],
    options: [
      { id: 'union', label: 'Perdoar o Rei e firmar a paz.', pts: { u: 2 }, lines: ['"Que assim seja: paz entre as ilhas." O Rei te entrega uma poção real e jura honrar o trato.'], items: { potion_hp_l: 1 }, flags: ['king_forgiven'] },
      { id: 'glory', label: 'Aceitar o título de Campeão dos Cães.', pts: { g: 2 }, lines: ['Os cães uivam em coro. "Salve o Campeão!" Você recebe a coroa de honra (e algumas moedas).'], coins: 100, flags: ['king_champion'] },
      { id: 'power', label: 'Exigir um tributo.', pts: { p: 2 }, lines: ['O Rei range os dentes, mas paga. "Moedas... mas nunca o respeito."'], coins: 150, flags: ['king_tribute'] },
    ],
  },
  {
    id: 'frag_inscription',
    npcId: 'bento',
    available: () => done('lore_complete'),
    intro: ['Você reuniu as três partes da inscrição? Deixe-me ver...', '"Quando a ilha foi partida, o poder que a mantinha inteira se espalhou. Só quem reunir as três partes vai entender o que realmente foi perdido."', 'O poder está ao seu alcance, meu jovem. O que fará com ele?'],
    options: [
      { id: 'union', label: 'Restaurar a inscrição na pedra.', pts: { u: 3 }, lines: ['A pedra brilha de leve. Bento sorri: "Algo antigo, adormecido, começou a se juntar de novo."'], items: { potion_hp_l: 2 }, flags: ['stone_restored'] },
      { id: 'glory', label: 'Guardar as partes como troféu.', pts: { g: 3 }, lines: ['Bento arqueia as sobrancelhas. "Como quiser. Um troféu é um troféu."'], coins: 100, flags: ['stone_kept'] },
      { id: 'power', label: 'Absorver o poder para mim.', pts: { p: 3 }, lines: ['Uma energia sombria percorre seu corpo. Bento se afasta um passo: "Entendo..."'], items: { power_brew: 2 }, flags: ['stone_absorbed'] },
    ],
  },
  {
    id: 'forge_choice',
    npcId: 'brasa',
    available: () => done('forge_fire'),
    intro: ['A forja está no ponto. Com a alma da lava, posso fazer UMA coisa.', 'Um escudo para a vila... ou uma lâmina só sua. Qual vai ser?'],
    options: [
      { id: 'union', label: 'Forjar o Escudo da Vila.', pts: { u: 2 }, lines: ['Brasa trabalha por horas. O escudo sai reluzente: "Isso vai proteger muita gente."'], items: { w_shield: 1 }, flags: ['forged_shield'] },
      { id: 'power', label: 'Forjar a Lâmina de Brasa só para mim.', pts: { p: 2 }, lines: ['Brasa trabalha por horas. A lâmina sai ardendo: "Cuidado... ela gosta de sangue."'], items: { w_axe: 1 }, flags: ['forged_blade'] },
    ],
  },
  {
    id: 'breno_help',
    npcId: 'garoto_sombrio',
    available: () => done('talk_breno'),
    intro: ['...Estou perdido há tanto tempo que já esqueci como era a luz.', 'Você... pode me ajudar a sair daqui? Ou prefere me deixar com a minha sombra?'],
    options: [
      { id: 'union', label: 'Ajudar Breno a sair do labirinto.', pts: { u: 2 }, lines: ['Breno chora de alívio. "Eu nunca vou esquecer isso. Procure por mim quando precisar."'], flags: ['breno_helped'] },
      { id: 'glory', label: 'Deixar: cada um com seu caminho.', pts: { g: 2 }, lines: ['Breno assente em silêncio. "Entendo. Boa sorte, lutador."'], flags: ['breno_left'] },
      { id: 'power', label: 'Usá-lo de isca para os monstros.', pts: { p: 2 }, lines: ['Você aproveita a distração e coleta alguns achados. Breno nem percebe o que fez por você.'], coins: 60, flags: ['breno_bait'] },
    ],
  },
  {
    id: 'sigma_statue',
    npcId: 'moai',
    available: () => true,
    intro: ['*A estátua do Sigma Boy parece te encarar por dentro.*', '(Uma voz sem boca ecoa:) "Você chegou até aqui. Tenho UM presente, e só uma vez. Escolha."'],
    options: [
      { id: 'power', label: 'Aceitar o Poder.', pts: { p: 3 }, lines: ['Uma força crua entra em você. (+3 pontos de status)'], statPoints: 3, flags: ['sigma_power'] },
      { id: 'union', label: 'Aceitar a Sabedoria.', pts: { u: 3 }, lines: ['Memórias antigas passam diante dos seus olhos. (+500 XP)'], xp: 500, flags: ['sigma_wisdom'] },
      { id: 'glory', label: 'Rejeitar: eu mesmo conquisto o que quero.', pts: { g: 3 }, lines: ['A estátua parece... sorrir. "Interessante." Algo de você ficou marcado, e você sente que ela voltará a falar com você.'], flags: ['sigma_rejected'] },
    ],
  },
];

export const CHOICE_BY_ID: Record<string, ChoiceDef> = Object.fromEntries(STORY_CHOICES.map((c) => [c.id, c]));
export const CHOICE_COUNT = STORY_CHOICES.length;

/** A escolha que esse NPC oferece agora (disponível e ainda não feita), ou null. */
export function pendingChoiceFor(npcId: string): ChoiceDef | null {
  return STORY_CHOICES.find((c) => c.npcId === npcId && !getChoice(c.id) && c.available()) ?? null;
}

/** Soma de pontos por final de todas as escolhas feitas. */
export function choiceScores(): { u: number; g: number; p: number } {
  const out = { u: 0, g: 0, p: 0 };
  const made = getChoices();
  for (const c of STORY_CHOICES) {
    const o = c.options.find((x) => x.id === made[c.id]);
    if (!o) continue;
    out.u += o.pts.u ?? 0;
    out.g += o.pts.g ?? 0;
    out.p += o.pts.p ?? 0;
  }
  return out;
}

/** Registra a escolha, dá as consequências e devolve as linhas de recompensa para mostrar. */
export function applyChoice(choiceId: string, optionId: string): string[] {
  const c = CHOICE_BY_ID[choiceId];
  const o = c?.options.find((x) => x.id === optionId);
  if (!c || !o) return [];
  makeChoice(choiceId, optionId);
  for (const f of o.flags ?? []) setFlag(f);
  const info: string[] = [];
  if (o.coins) {
    addCoins(o.coins, false);
    info.push(`+${o.coins} MC`);
  }
  for (const [id, q] of Object.entries(o.items ?? {})) {
    addItem(id, q, true);
    info.push(`${q > 1 ? q + 'x ' : ''}${itemName(id)}`);
  }
  if (o.statPoints) {
    addStatPoints(o.statPoints);
    info.push(`+${o.statPoints} pontos de status`);
  }
  if (o.xp) {
    addXp(o.xp);
    info.push(`+${o.xp} XP`);
  }
  return info;
}
