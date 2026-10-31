import { getMissionList, getQuestStatus } from '@/game/state/questState';
import { choiceScores, CHOICE_BY_ID } from './storyChoices';
import { getChoice, getChoiceOrder, getEnding, type Ending } from '@/game/state/storyFlags';

/**
 * Qual final o jogador alcança. Cada escolha importante e cada missão secreta/de caminho concluída soma
 * pontos em União (u), Glória (g) ou Poder (p). Vence quem tiver mais pontos; em caso de empate vale a categoria
 * da ÚLTIMA escolha feita e, se ainda empatar, Glória.
 */
export function computeScores(): { u: number; g: number; p: number } {
  const s = choiceScores();
  for (const m of getMissionList()) {
    if (!m.storyPts || getQuestStatus(m.id) !== 'completed') continue;
    s.u += m.storyPts.u ?? 0;
    s.g += m.storyPts.g ?? 0;
    s.p += m.storyPts.p ?? 0;
  }
  return s;
}

const NAME: Record<'u' | 'g' | 'p', Ending> = { u: 'union', g: 'glory', p: 'power' };

export function computeEnding(): Ending {
  const s = computeScores();
  const max = Math.max(s.u, s.g, s.p);
  const tied = (['u', 'g', 'p'] as const).filter((k) => s[k] === max);
  if (tied.length === 1) return NAME[tied[0]];
  // desempate: a última escolha feita pende para qual lado?
  for (const id of [...getChoiceOrder()].reverse()) {
    const o = CHOICE_BY_ID[id]?.options.find((x) => x.id === getChoice(id));
    if (!o) continue;
    const best = tied.reduce((a, b) => ((o.pts[b] ?? 0) > (o.pts[a] ?? 0) ? b : a), tied[0]);
    if ((o.pts[best] ?? 0) > 0) return NAME[best];
  }
  return tied.includes('g') ? 'glory' : NAME[tied[0]];
}

type Five = [string, string, string, string, string];
export interface EndingText {
  title: Five;
  lines: Five[];
}

export const ENDING_TEXT: Record<Ending, EndingText> = {
  union: {
    title: ['A ILHA INTEIRA', 'THE WHOLE ISLAND', 'LA ISLA ENTERA', 'L’ÎLE ENTIÈRE', 'ひとつの島'],
    lines: [
      ['Com as três partes unidas na pedra, o chão tremeu.', 'With the three parts joined at the stone, the ground trembled.', 'Con las tres partes unidas en la piedra, el suelo tembló.', 'Les trois parties réunies sur la pierre, le sol trembla.', '三つの欠片が石に戻ると、大地が震えた。'],
      ['As ilhas partidas se aproximaram, uma a uma, como quem volta para casa.', 'The broken islands drifted closer, one by one, like people coming home.', 'Las islas rotas se acercaron, una a una, como quien vuelve a casa.', 'Les îles brisées se rapprochèrent, une à une, comme on rentre chez soi.', '割れた島々が、家に帰るように一つずつ寄り添った。'],
      ['Na praça, todos que você ajudou fizeram uma grande festa.', 'In the plaza, everyone you helped threw a huge party.', 'En la plaza, todos a quienes ayudaste hicieron una gran fiesta.', 'Sur la place, tous ceux que vous avez aidés ont fait une grande fête.', '広場では、助けた皆が大きな宴を開いた。'],
      ['Gadigago, o Capitão, o Rei dos Cães, Breno... cada um tinha um lugar à mesa.', 'Gadigago, the Captain, the Dog King, Breno... everyone had a seat at the table.', 'Gadigago, el Capitán, el Rey de los Perros, Breno... todos tenían un lugar en la mesa.', 'Gadigago, le Capitaine, le Roi des Chiens, Breno... chacun avait sa place à table.', 'ガディゴゴ、隊長、犬の王、ブレノ…誰もが食卓に席を持っていた。'],
      ['Dogge nunca precisou de um título. Para todos, ele era o Meme Fighter de todos.', 'Dogge never needed a title. To everyone, he was the Meme Fighter of all.', 'Dogge nunca necesitó un título. Para todos, era el Meme Fighter de todos.', 'Dogge n’a jamais eu besoin d’un titre. Pour tous, il était le Meme Fighter de tous.', 'ドッゲに肩書きは要らなかった。皆にとって、彼は皆のミームファイターだった。'],
    ],
  },
  glory: {
    title: ['O VERDADEIRO MEME FIGHTER', 'THE TRUE MEME FIGHTER', 'EL VERDADERO MEME FIGHTER', 'LE VRAI MEME FIGHTER', '真のミームファイター'],
    lines: [
      ['O último golpe ecoou pela praça inteira.', 'The final blow echoed across the whole plaza.', 'El último golpe resonó por toda la plaza.', 'Le dernier coup résonna sur toute la place.', '最後の一撃が広場中に響き渡った。'],
      ['Por um instante, ninguém respirou. Então o rugido da multidão cobriu o mar.', 'For a moment, nobody breathed. Then the roar of the crowd covered the sea.', 'Por un instante, nadie respiró. Entonces el rugido de la multitud cubrió el mar.', 'Un instant, personne ne respira. Puis le rugissement de la foule couvrit la mer.', '一瞬、誰も息をしなかった。そして歓声が海を覆った。'],
      ['Uma estátua do Dogge foi erguida ao lado do Sigma Boy.', 'A statue of Dogge was raised next to Sigma Boy.', 'Se levantó una estatua de Dogge junto a Sigma Boy.', 'Une statue de Dogge fut érigée à côté de Sigma Boy.', 'ドッゲの像がシグマボーイの隣に建てられた。'],
      ['Gadigago apertou os punhos, sorriu e prometeu uma nova revanche.', 'Gadigago clenched his fists, smiled and promised a new rematch.', 'Gadigago apretó los puños, sonrió y prometió otra revancha.', 'Gadigago serra les poings, sourit et promit une nouvelle revanche.', 'ガディゴゴは拳を握り、笑って再戦を誓った。'],
      ['As ilhas seguiram partidas. Mas sempre haveria alguém querendo o seu título, e ele estaria pronto.', 'The islands stayed broken. But someone would always want his title, and he would be ready.', 'Las islas siguieron rotas. Pero siempre habría alguien queriendo su título, y estaría listo.', 'Les îles restèrent brisées. Mais quelqu’un voudrait toujours son titre, et il serait prêt.', '島々は割れたままだった。それでも彼の称号を狙う者は現れ続け、彼はいつでも受けて立った。'],
    ],
  },
  power: {
    title: ['O REI DAS SOMBRAS', 'THE SHADOW KING', 'EL REY DE LAS SOMBRAS', 'LE ROI DES OMBRES', '影の王'],
    lines: [
      ['O poder perdido respondeu ao chamado.', 'The lost power answered the call.', 'El poder perdido respondió al llamado.', 'Le pouvoir perdu répondit à l’appel.', '失われた力が呼びかけに応えた。'],
      ['Uma energia escura envolveu Dogge, e o brilho dos seus olhos mudou para sempre.', 'A dark energy wrapped around Dogge, and the glow in his eyes changed forever.', 'Una energía oscura envolvió a Dogge, y el brillo de sus ojos cambió para siempre.', 'Une énergie sombre enveloppa Dogge, et la lueur de ses yeux changea pour toujours.', '暗いエネルギーがドッゲを包み、その瞳の輝きは永遠に変わった。'],
      ['Na Ilha das Trevas, um trono o esperava.', 'On the Island of Darkness, a throne awaited him.', 'En la Isla de las Tinieblas, un trono lo esperaba.', 'Sur l’île des Ténèbres, un trône l’attendait.', '闇の島では、玉座が彼を待っていた。'],
      ['Gadigago partiu sem olhar para trás. Os outros baixaram a cabeça, com medo.', 'Gadigago left without looking back. The others lowered their heads in fear.', 'Gadigago se fue sin mirar atrás. Los demás bajaron la cabeza, con miedo.', 'Gadigago partit sans se retourner. Les autres baissèrent la tête, de peur.', 'ガディゴゴは振り返らず去った。他の者たちは恐れて頭を垂れた。'],
      ['Agora todos o chamam de Sigma... e ninguém mais ousa dizer o contrário.', 'Now everyone calls him Sigma... and no one dares say otherwise.', 'Ahora todos lo llaman Sigma... y nadie se atreve a decir lo contrario.', 'Maintenant tout le monde l’appelle Sigma... et personne n’ose dire le contraire.', '今や皆が彼をシグマと呼ぶ。誰も異を唱えようとはしなかった。'],
    ],
  },
};

/** A missão final foi concluída e o final ainda não foi mostrado neste save? */
export function endingShouldPlay(): boolean {
  if (getEnding()) return false;
  const fin = getMissionList().find((m) => m.final);
  return !!fin && getQuestStatus(fin.id) === 'completed';
}

export const CREDITS: Five[] = [
  ['MEME FIGHTER RPG', 'MEME FIGHTER RPG', 'MEME FIGHTER RPG', 'MEME FIGHTER RPG', 'MEME FIGHTER RPG'],
  ['Obrigado por jogar!', 'Thanks for playing!', '¡Gracias por jugar!', 'Merci d’avoir joué !', 'プレイありがとう！'],
  ['Você pode continuar explorando o mundo, ou começar outro mundo para viver outro final.', 'You can keep exploring the world, or start another world to live a different ending.', 'Puedes seguir explorando el mundo, o empezar otro mundo para vivir otro final.', 'Vous pouvez continuer à explorer, ou commencer un autre monde pour vivre une autre fin.', 'このまま世界を探索しても、別のワールドで違う結末を見てもかまいません。'],
];
