import type { MissionDef } from '../missionTypes';
import type { CampaignChoice, CampaignDef, CampaignEnding, CampaignNpcOverride } from './campaignTypes';
import { ORC_CUTSCENES } from './orcCutscenes';

/**
 * CAMPANHA DO ORC: "Farda Cinzenta, Consciência Cinzenta". 12 missões principais em 5 atos, mais as missões de caminho
 * (voltar ao acampamento, ou seguir sozinho: final C). Decisões fixas: o espião encapuzado é o NPC Eremita Tobias (sprite do
 * lutador NINJA nesta campanha); o Gadigago do Ato 2 é o NPC `rival` da praça; o jogador começa no acampamento (400, 1340).
 */
const FINAL_TITLE = 'Meme Fighter'; // mesmo valor de FINAL_MISSION_TITLE (characters.ts); repetido aqui para evitar ciclo de import

const A1 = 'Ato 1 · Sentido!';
const A2 = 'Ato 2 · Ordens Estranhas';
const A3 = 'Ato 3 · A Deserção';
const A4 = 'Ato 4 · Consertar o Quebrado';
const SEC = 'Segredos do Orc';
const A5 = 'Ato 5 · Dispensa Honrosa';

/** Onde o espião Tobias espera, fora da caverna (corredor livre ao lado do Guardião de Pedra). */
export const ORC_SPY_SPOT = { x: 528, y: 835 };

const MISSIONS: MissionDef[] = [
  {
    id: 'orc_ordem', title: 'Sentido!', hint: 'Apresente-se ao Capitão Ferro, no portão do acampamento.', type: 'quest', chapter: A1, reward: { coins: 30, items: { bread: 2 }, xp: 80 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'soldier_captain', hint: 'Fale com o Capitão Ferro, que dá as ordens do dia.', lines: ['Soldado! Missão do dia: confiscar suprimentos em nome da Legião. Mandado assinado.', 'Primeiro, treino com o Grosh. Depois, a bênção do Irmão Tico. Dispensado.'] },
        { kind: 'talk', npcId: 'tico', hint: 'Receba a bênção do Irmão Tico antes da ronda.', lines: ['Que a ronda seja leve, meu filho.', 'Lembre: quem carrega peso demais esquece por que carrega.'] },
      ],
    },
  },
  {
    id: 'orc_treino', title: 'Treino com o Grosh', hint: 'Grosh, seu único amigo, quer testar o seu golpe antes da ronda.', type: 'battle', chapter: A1, requires: ['orc_ordem'],
    objective: { kind: 'battle', giver: 'orc_guard', opponent: 'orc', stageKey: 'stage_10', reward: 50, offerTitleKey: 'quest_orc_treino_offer' },
    dialogue: {
      unstarted: ['Hmpf. Eu e você, na terra batida. Sem sopa para quem perder.', 'Meu golpe é pesado, o seu também. Vamos ver quem derruba quem.'],
      active: ['Bora. Não vou pegar leve só porque a gente divide a sopa.'],
      completed: ['Bom golpe. Pesado como a ordem de hoje. Boa ronda, soldado.'],
    },
  },
  {
    id: 'orc_confisco', title: 'O Mandado', hint: 'Pegue o barco do acampamento até a Ilha Principal e cumpra o mandado: a loja da Marina e o Toinho, na praça.', type: 'quest', chapter: A2, requires: ['orc_treino'], reward: { coins: 40, xp: 120 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'marina', hint: 'Entre na loja da praça e apresente o mandado para a Marina.', lines: ['Confiscar o estoque? Em nome de quem? Eu tenho crianças pra alimentar!', '...Está bem. Leve o que o papel manda. Mas saiba que isso não é justo.'] },
        { kind: 'talk', npcId: 'toinho', hint: 'Agora o mandado do Toinho, o vendedor ambulante da praça.', lines: ['Também eu? Eu só vendo bolsinha e fofoca!', 'A Legião não tem vergonha? Tá bom, tá bom. Leve. Mas me diga: você sabe o que está fazendo?'] },
      ],
    },
  },
  {
    id: 'orc_gadigago', title: 'Pense Antes de Obedecer', hint: 'Um jovem lutador na praça quer lhe fazer uma pergunta com os punhos.', type: 'battle', chapter: A2, requires: ['orc_confisco'],
    objective: { kind: 'battle', giver: 'rival', opponent: 'gadigago', stageKey: 'stage_1', reward: 80, offerTitleKey: 'quest_orc_gadigago_offer' },
    dialogue: {
      unstarted: ['Ei, você aí! Vi o que fez com a Marina e o Toinho.', 'Eu não aguento ver gente grande se esconder atrás de ordem. Luta comigo: se eu perder, calo a boca.'],
      active: ['Vem. Quero ver se o seu golpe pensa ou só obedece.'],
      completed: ['Você bate forte. Agora tenta pensar tão forte quanto bate. Só isso.'],
    },
  },
  {
    id: 'orc_ilha', title: 'A Terceira Ordem', hint: 'A terceira ordem é na Ilha dos Cães: requisitar ossos. Pegue o barco.', type: 'discover', chapter: A3, requires: ['orc_gadigago'], reward: { coins: 20 },
    objective: { kind: 'visit', island: 'dogisland' },
  },
  {
    id: 'orc_desercao', title: 'A Farda no Chão', hint: 'Fale com o Footman, o guarda da Ilha dos Cães, e entregue a ordem dos ossos.', type: 'quest', chapter: A3, requires: ['orc_ilha'], reward: { coins: 40, items: { drumstick: 2 }, xp: 140 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'footman_dog', hint: 'Entregue a ordem dos ossos ao Footman. Ele tem algo a dizer.', lines: ['Au! Ossos? Você veio requisitar os ossos dos cães?', 'Pense bem, grandalhão. Pense bem.'] },
        { kind: 'talk', npcId: 'barqueiro', hint: 'Fale com o Barqueiro, no cais da Ilha dos Cães.', lines: ['Sem a farda? Deixa eu adivinhar: a ordem pesou.', 'Entra no barco, de graça. Hoje a passagem é por minha conta.'] },
        { kind: 'talk', npcId: 'corvao', hint: 'O Corvão, um passarinho da ilha, tem notícias para você.', lines: ['Ouvi tudo. A Legião já sabe que você desertou.', 'Mas a ilha também sabe. E a ilha te acolhe, grandalhão.'] },
      ],
    },
  },
  {
    id: 'orc_tank', title: 'O Teste do Tank', hint: 'Tank, o guarda grandão da Ilha dos Cães, quer testar quem ficou sem farda.', type: 'battle', chapter: A3, requires: ['orc_desercao'],
    objective: { kind: 'battle', giver: 'tank_dog', opponent: 'tank', stageKey: 'stage_11', reward: 90, offerTitleKey: 'quest_orc_tank_offer' },
    dialogue: {
      unstarted: ['Grrr. Sem farda, é? Então quem é você agora?', 'Mostre a sua força. Não a da Legião: a sua.'],
      active: ['De novo? Gosto de quem insiste.'],
      completed: ['Passou. Quem larga a farda por decência tem o meu respeito.'],
    },
  },
  {
    id: 'orc_consertar', title: 'Consertar o Quebrado', hint: 'Volte à Ilha Principal: devolva a Marina e ao Toinho o que a Legião levou e procure Dona Iracema.', type: 'quest', chapter: A4, requires: ['orc_tank'], reward: { coins: 60, items: { bread: 3 }, xp: 150 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'marina', hint: 'Devolva à Marina o estoque que a Legião confiscou.', lines: ['Você voltou? E trouxe tudo de volta?!', 'Eu não esperava. Ninguém da Legião nunca devolveu nada. Obrigada, de coração.'] },
        { kind: 'talk', npcId: 'toinho', hint: 'Devolva ao Toinho o que foi levado.', lines: ['Minhas bolsinhas! Todas!', 'Já fofoquei para a praça inteira: tem um orc decente por aqui.'] },
        { kind: 'talk', npcId: 'iracema', hint: 'Dona Iracema ofereceu um quarto. Fale com ela na casa ao lado da praça.', lines: ['Sem farda você parece até maior. E mais leve!', 'Pode ficar no quarto dos fundos. Eu preciso de alguém que carregue peso por um bom motivo.'] },
      ],
    },
  },
  {
    id: 'orc_provas', title: 'As Provas Escondidas', hint: 'O Eremita Tobias, na caverna perto da praça, diz guardar provas do que a Legião fez.', type: 'quest', chapter: A4, requires: ['orc_consertar'], reward: { coins: 50, items: { potion_guard: 1 }, xp: 150 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'enter', buildingId: 'caverna', hint: 'Entre na caverna perto da praça.' },
        { kind: 'pickups', ids: ['chest_caverna_deep'], hint: 'Desça até a galeria profunda e abra o baú das provas.' },
        { kind: 'talk', npcId: 'eremita', hint: 'Mostre o baú ao Eremita Tobias.', lines: ['Então eram essas as provas: ordens assinadas, contas, listas de quem foi roubado.', 'A Legião pagaria muito por elas... Que sorte a minha ser um simples eremita. Ha. Ha.', 'Espere lá fora. Preciso... pegar o meu cajado.'] },
      ],
    },
  },
  {
    id: 'orc_espiao', title: 'O Espião Encapuzado', hint: 'Tobias nunca foi só um eremita. Ele espera na entrada da caverna, do lado de fora.', type: 'battle', chapter: A4, requires: ['orc_provas'],
    objective: { kind: 'battle', giver: 'eremita', opponent: 'ninja', stageKey: 'stage_12', reward: 120, offerTitleKey: 'quest_orc_espiao_offer' },
    dialogue: {
      unstarted: ['Ha. Eu era o olho da Legião na caverna. Não sou eremita coisa nenhuma.', 'Me dê essas provas e eu esqueço que te vi. Ou então lute, grandalhão.'],
      active: ['Última chance. As provas, ou a luta.'],
      completed: ['(Tobias foge pelo mato, deixando o capuz para trás.)'],
    },
  },
  {
    id: 'orc_caminho', title: 'O Que Fazer com as Provas', hint: 'Fale com a Dona Iracema e decida o seu caminho: voltar ao acampamento ou seguir sozinho.', type: 'quest', chapter: A4, requires: ['orc_espiao'],
    objective: { kind: 'flag', flag: 'orc_path_chosen' },
  },
  // ---- Caminho A/B: voltar ao acampamento
  {
    id: 'orc_volta', title: 'De Volta ao Acampamento', hint: 'Volte ao acampamento sem farda e fale com o Irmão Tico e com o Grosh.', type: 'quest', chapter: A5, requires: ['orc_caminho'], branch: { choice: 'orc_caminho', option: 'voltar' }, reward: { coins: 60, xp: 180 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'reach', x: 400, y: 1338, r: 14, hint: 'Pegue o barco e volte ao acampamento da Legião Cinzenta.' },
        { kind: 'talk', npcId: 'tico', hint: 'Fale com o Irmão Tico, no acampamento.', lines: ['Você voltou. E sem a farda. Eu sabia.', 'Eu dizia que quem carrega peso demais esquece por que carrega. Você lembrou. Agora ajude os outros a lembrar.'] },
        { kind: 'talk', npcId: 'orc_guard', hint: 'Fale com o Grosh, o seu amigo.', lines: ['Você... largou a farda. Eu vi o que a Legião fez. Eu vi e fiquei calado.', 'Obedecer não é estar certo, não é? Droga. Eu devia ter dito antes.'] },
      ],
    },
  },
  {
    id: 'orc_duelo', title: 'O Duelo de Dispensa', hint: 'O regulamento diz que só um duelo contra o Capitão dispensa um soldado com honra.', type: 'battle', chapter: A5, requires: ['orc_volta'], branch: { choice: 'orc_caminho', option: 'voltar' },
    objective: { kind: 'battle', giver: 'soldier_captain', opponent: 'soldier', stageKey: 'stage_10', reward: 160, offerTitleKey: 'quest_orc_duelo_offer' },
    dialogue: {
      unstarted: ['Soldado. Voltou sem farda e com provas. Tem coragem, isso eu admito.', 'O regulamento é claro: só um duelo comigo dispensa um soldado. Sem trapaça, sem pena.'],
      active: ['Em posição. A tropa está olhando.'],
      completed: ['Eu perdi... e a tropa viu. Eu perguntei para mim mesmo para quem eu obedecia. Não gostei da resposta.'],
    },
  },
  {
    id: 'orc_final', title: FINAL_TITLE, hint: 'O Capitão Ferro está de joelhos, diante da tropa. Fale com ele e decida como termina a história da Legião.', type: 'quest', chapter: A5, final: true, requires: ['orc_duelo'], branch: { choice: 'orc_caminho', option: 'voltar' },
    objective: { kind: 'flag', flag: 'orc_choice_done' },
  },
  // ---- Caminho C: o desertor (não voltar)
  {
    id: 'orc_desertor', title: FINAL_TITLE, hint: 'Sem nome e sem bandeira: leve pães a quem precisa. Fale com a Marina e depois com o Barqueiro.', type: 'quest', chapter: A5, final: true, requires: ['orc_caminho'], branch: { choice: 'orc_caminho', option: 'desertor' }, reward: { coins: 80, xp: 250 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'marina', hint: 'Fale com a Marina: ela tem uma cesta de pães para você entregar.', lines: ['Leve esta cesta. Deixe na porta de quem precisar. Sem bilhete, sem nome.', 'Você não precisa de farda para ser decente, sabia?'] },
        { kind: 'talk', npcId: 'barqueiro', hint: 'Fale com o Barqueiro e siga viagem sozinho.', lines: ['Para onde? Para onde alguém precisar de um par de braços fortes?', 'Entre. A Legião te caça, mas o mar é grande.'] },
      ],
    },
  },
  // ---- SECRETAS (opcionais: aparecem como "???" até serem descobertas e não são exigidas para o final)
  {
    id: 'orc_sec_marmita', title: 'A Marmita do Grosh', hint: 'O Grosh anda com fome desde que a Legião cortou a ração. Fale com ele no acampamento.', type: 'quest', chapter: SEC, optional: true, secret: true,
    requires: ['orc_treino'], discover: { talk: 'orc_guard' }, reward: { coins: 80, xp: 220, items: { bread: 3 } },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'marina', hint: 'Peça à Marina um pão quentinho para o Grosh, na vila.', give: { bread: 1 }, lines: ['Pão quentinho para o Grosh? Aquele grandão come igual a você, só que escondido.', 'Tome. Diga que é por conta da casa. Ele vai fingir que não gostou.'] },
        { kind: 'talk', npcId: 'orc_guard', hint: 'Entregue o pão ao Grosh, no acampamento.', take: { bread: 1 }, lines: ['Isto é... pão de verdade? Sem areia, sem ordem de serviço?', 'Não conta pro Capitão. Nem pra ninguém. Eu devo uma. Duas.'] },
      ],
    },
  },
  {
    id: 'orc_sec_peso', title: 'Peso Bom é Peso Dividido', hint: 'Toinho tem um caminho cheio de monstros e mãos ocupadas. Ouça o que ele diz.', type: 'quest', chapter: SEC, optional: true, secret: true,
    requires: ['orc_confisco'], discover: { talk: 'toinho' }, reward: { coins: 120, xp: 280, items: { potion_guard: 1 } },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'kills', count: 8, hint: 'Derrote 8 monstros para limpar o caminho do Toinho.' },
        { kind: 'talk', npcId: 'toinho', hint: 'Avise o Toinho que a estrada está livre.', lines: ['Livre?! Eu levo as bolsinhas de volta hoje!', 'Você carrega peso como quem carrega presente. Os outros carregam como quem carrega culpa. Aprenda a diferença.'] },
      ],
    },
  },
  {
    id: 'orc_sec_capuz', title: 'O Capuz de Tobias', hint: 'O espião deixou algo para trás na saída da caverna. Dona Iracema sabe de uma história.', type: 'quest', chapter: SEC, optional: true, secret: true,
    requires: ['orc_espiao'], discover: { talk: 'iracema' }, reward: { coins: 150, xp: 350, items: { meme_token: 1 } },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'reach', x: ORC_SPY_SPOT.x, y: ORC_SPY_SPOT.y, r: 5, hint: 'Procure o capuz que o Tobias largou, onde ele estava, na saída da caverna.' },
        { kind: 'talk', npcId: 'iracema', hint: 'Mostre o capuz à Dona Iracema.', lines: ['Este bordado é da Legião, mas a costura é da minha comadre da vila. Ele tinha ajuda de dentro.', 'Guarde o capuz. Um dia ele vai ser prova, ou piada. Das duas coisas eu gosto.'] },
      ],
    },
  },
];

const CHOICES: CampaignChoice[] = [
  {
    id: 'orc_farda',
    npcId: 'footman_dog',
    afterMission: 'orc_ilha',
    intro: [
      '*Footman olha o papel e depois olha para você.*',
      'Requisitar os ossos dos cães? Isso é a terceira ordem da Legião. Quem manda uma coisa dessas?',
      'Você é maior do que eu. Mas ordem sem pergunta é só peso nas costas. O que vai fazer, soldado?',
    ],
    options: [
      { id: 'silencio', label: 'Deixar a farda no chão e ir embora em silêncio.', lines: ['Você dobra a farda com cuidado e deixa no chão. Footman assente. "Quando quiser, a ilha tem sopa."'], flags: ['orc_farda'], xp: 60 },
      { id: 'rasgar', label: 'Rasgar a ordem na frente do Footman.', lines: ['O papel vira confete. Footman ri, surpreso. "Au! Agora sim eu gostei de você, grandalhão!"'], flags: ['orc_farda'], xp: 60 },
    ],
  },
  {
    id: 'orc_caminho',
    npcId: 'iracema',
    afterMission: 'orc_espiao',
    intro: [
      'Você enfrentou o espião e ainda tem as provas, meu filho. Isso pesa nas mãos.',
      'Dá para voltar ao acampamento, entregar tudo ao Capitão e pedir a dispensa com honra. Ou dá para não voltar nunca mais, e viver sem bandeira.',
      'Eu só te peço: que seja uma escolha sua, e não uma ordem.',
    ],
    options: [
      { id: 'voltar', label: 'Voltar ao acampamento com as provas.', lines: ['"Eu sabia que você ia querer olhar nos olhos deles", diz Dona Iracema. "Vá. A capa nova fica pronta quando você voltar."'], flags: ['orc_path_chosen'] },
      { id: 'desertor', label: 'Não voltar: seguir sozinho, sem nome e sem bandeira.', lines: ['Dona Iracema assente devagar. "Então leve pão para quem precisa por onde passar. É a única bandeira que presta."'], flags: ['orc_path_chosen', 'orc_end_c'] },
    ],
  },
  {
    id: 'orc_final',
    npcId: 'soldier_captain',
    afterMission: 'orc_duelo',
    intro: [
      '*O Capitão Ferro baixa a espada. A tropa inteira observa.*',
      'Eu perdi. Pelo regulamento, você está dispensado. Com honra.',
      'Mas você traz as provas do que mandei fazer. A tropa quer ouvir. Diga, soldado: o que será da Legião Cinzenta?',
    ],
    options: [
      { id: 'dispensa', label: 'Entregar as provas ao Capitão e perdoá-lo.', lines: ['"Soldado, está dispensado. Com honra." Grosh entrega a concha da sopa, a única coisa que tem. A tropa bate continência.'], flags: ['orc_end_a', 'orc_choice_done'], xp: 250 },
      { id: 'tropa', label: 'Convencer a tropa a largar as ordens junto com você.', lines: ['Grosh é o primeiro a deixar a farda no pátio. Depois Tico. Depois dezenas. O pátio vira um mar de fardas cinzentas no chão.'], flags: ['orc_end_b', 'orc_choice_done'], xp: 250 },
    ],
  },
];

const ENDINGS: CampaignEnding[] = [
  {
    id: 'orc_end_a', flag: 'orc_end_a', kind: 'union', cutsceneId: 'orc_end_a',
    title: ['DISPENSA HONROSA', 'HONORABLE DISCHARGE', 'BAJA HONROSA', 'CONGÉ HONORABLE', '名誉ある除隊'],
    lines: [
      ['O Capitão baixou a espada e disse diante da tropa: "Soldado, está dispensado. Com honra."', 'The Captain lowered his sword and said before the troops: "Soldier, you are discharged. With honor."', 'El Capitán bajó la espada y dijo ante la tropa: "Soldado, queda dado de baja. Con honor."', 'Le Capitaine baissa son épée et dit devant la troupe : « Soldat, vous êtes congédié. Avec honneur. »', '隊長は剣を下ろし、部隊の前で言った。「兵士よ、除隊を許す。名誉と共に。」'],
      ['Grosh entregou a concha da sopa, a única coisa que tinha.', 'Grosh handed over the soup ladle, the only thing he owned.', 'Grosh entregó el cucharón de la sopa, lo único que tenía.', 'Grosh a tendu la louche de la soupe, la seule chose qu’il possédait.', 'グロッシュはスープのお玉を差し出した。彼が持つ唯一のものだった。'],
      ['Dona Iracema bordou uma capa nova, sem emblema, "porque agora é a dele".', 'Mrs. Iracema embroidered a new cape, with no emblem, "because now it is his own".', 'Doña Iracema bordó una capa nueva, sin emblema, "porque ahora es suya".', 'Madame Iracema a brodé une cape neuve, sans emblème, « parce que maintenant elle est à lui ».', 'イラセマさんは紋章のない新しいマントを縫った。「だって、これからは彼自身のものだから」。'],
      ['A Legião ganhou uma regra nova, escrita pelo Capitão em letra tremida: "Antes de cumprir, perguntar para quem."', 'The Legion got a new rule, written by the Captain in shaky letters: "Before obeying, ask who for."', 'La Legión ganó una regla nueva, escrita por el Capitán con letra temblorosa: "Antes de cumplir, preguntar para quién."', 'La Légion a gagné une règle nouvelle, écrite par le Capitaine d’une écriture tremblante : « Avant d’obéir, demander pour qui. »', '軍団に新しい規則ができた。隊長が震える字で書いた。「従う前に、誰のためかを尋ねよ。」'],
      ['No cais, com um pão quente, o Orc escreveu para a mãe: "Eu consegui."', 'On the dock, with a warm loaf, the Orc wrote to his mother: "I did it."', 'En el muelle, con un pan caliente, el Orco le escribió a su madre: "Lo logré."', 'Sur le quai, avec un pain chaud, l’Orc a écrit à sa mère : « J’ai réussi. »', '埠頭で温かいパンを手に、オークは母に書いた。「やったよ。」'],
    ],
  },
  {
    id: 'orc_end_b', flag: 'orc_end_b', kind: 'glory', cutsceneId: 'orc_end_b',
    title: ['A TROPA INTEIRA', 'THE WHOLE TROOP', 'LA TROPA ENTERA', 'LA TROUPE ENTIÈRE', '部隊まるごと'],
    lines: [
      ['Grosh, Tico e dezenas de soldados deixaram a farda no pátio.', 'Grosh, Tico and dozens of soldiers left their uniforms in the yard.', 'Grosh, Tico y decenas de soldados dejaron el uniforme en el patio.', 'Grosh, Tico et des dizaines de soldats ont laissé leur uniforme dans la cour.', 'グロッシュ、ティコ、そして数十人の兵士が、練兵場に軍服を置いていった。'],
      ['A Legião Cinzenta deixou de existir como exército.', 'The Grey Legion stopped existing as an army.', 'La Legión Gris dejó de existir como ejército.', 'La Légion Grise a cessé d’exister en tant qu’armée.', '灰色の軍団は、軍隊として存在しなくなった。'],
      ['Virou uma cozinha comunitária, com panelões e fila de gente com fome.', 'It became a community kitchen, with huge pots and a line of hungry people.', 'Se volvió una cocina comunitaria, con ollas enormes y fila de gente con hambre.', 'Elle est devenue une cuisine communautaire, avec de grandes marmites et une file de gens affamés.', '大鍋と、お腹をすかせた人々の列がある、みんなの食堂になった。'],
      ['O Capitão Ferro ficou sozinho no acampamento, com um caldeirão, aprendendo a fazer sopa.', 'Captain Ferro stayed alone in the camp, with a cauldron, learning to make soup.', 'El Capitán Ferro se quedó solo en el campamento, con un caldero, aprendiendo a hacer sopa.', 'Le Capitaine Ferro est resté seul au camp, avec un chaudron, apprenant à faire la soupe.', 'フェロ隊長は野営地にひとり残り、大鍋を前にスープの作り方を学んでいた。'],
      ['O Orc voltou em silêncio e ajudou a mexer.', 'The Orc came back in silence and helped to stir.', 'El Orco volvió en silencio y ayudó a remover.', 'L’Orc est revenu en silence et a aidé à remuer.', 'オークは黙って戻ってきて、かき混ぜるのを手伝った。'],
    ],
  },
  {
    id: 'orc_end_c', flag: 'orc_end_c', kind: 'power', cutsceneId: 'orc_end_c',
    title: ['O DESERTOR', 'THE DESERTER', 'EL DESERTOR', 'LE DÉSERTEUR', '脱走兵'],
    lines: [
      ['O Orc seguiu sozinho, sem nome e sem bandeira.', 'The Orc went on alone, with no name and no flag.', 'El Orco siguió solo, sin nombre y sin bandera.', 'L’Orc a poursuivi seul, sans nom et sans drapeau.', 'オークは名もなく、旗もなく、ひとりで歩き続けた。'],
      ['Ajudava por onde passava: carregava peso, consertava telhados, dividia o pouco que tinha.', 'He helped wherever he went: carried loads, fixed roofs, shared the little he had.', 'Ayudaba por donde pasaba: cargaba peso, arreglaba techos, compartía lo poco que tenía.', 'Il aidait partout où il passait : portait des charges, réparait des toits, partageait le peu qu’il avait.', '行く先々で人を助けた。荷物を運び、屋根を直し、わずかなものを分け合った。'],
      ['A Legião o caçou pelo resto do ano. Ninguém o encontrou.', 'The Legion hunted him for the rest of the year. Nobody found him.', 'La Legión lo persiguió el resto del año. Nadie lo encontró.', 'La Légion l’a pourchassé le reste de l’année. Personne ne l’a trouvé.', '軍団は年末まで彼を追ったが、誰も見つけられなかった。'],
      ['De vez em quando aparecia uma cesta de pães na porta de alguém, sem remetente.', 'Now and then a basket of bread appeared at someone’s door, with no sender.', 'De vez en cuando aparecía una cesta de panes en la puerta de alguien, sin remitente.', 'De temps en temps, un panier de pains apparaissait à la porte de quelqu’un, sans expéditeur.', '時々、誰かの家の戸口に、差出人のないパンの籠が置かれていた。'],
      ['Um final livre e melancólico, sem dispensa.', 'A free and melancholic ending, with no discharge.', 'Un final libre y melancólico, sin baja.', 'Une fin libre et mélancolique, sans congé.', '自由で、どこか寂しい結末。除隊の知らせはなかった。'],
    ],
  },
];

const NPC_OVERRIDES: Record<string, CampaignNpcOverride> = {
  // O espião encapuzado: o Eremita Tobias usa o sprite do Ninja nesta campanha.
  eremita: {
    name: 'Eremita Tobias', role: 'Morador da Caverna', fighterSprite: 'ninja', kind: 'friendly',
    dialogue: ['Visita? Faz tempo que ninguém desce até aqui.', 'Sou só um eremita, sabe? Eu vigio a caverna e mais nada. Ha. Ha.'],
    rules: [
      { when: (c) => c.done('orc_espiao'), lines: ['(O capuz de Tobias ficou no chão, junto com um bilhete rasgado da Legião.)'] },
    ],
  },
  soldier_captain: {
    dialogue: ['Soldado! Disciplina, sempre disciplina.', 'A Legião cumpre ordens. Sempre.'],
    rules: [
      { when: (c) => c.flag('orc_end_a'), lines: ['Escrevi uma regra nova no mural: "Antes de cumprir, perguntar para quem." A letra ficou feia, mas é minha.'] },
      { when: (c) => c.flag('orc_end_b'), lines: ['*O Capitão mexe um caldeirão enorme, com cara de quem não sabe o que está fazendo.*', 'Sopa. Quem diria que era tão difícil.'] },
      { when: (c) => c.done('orc_duelo'), lines: ['Eu perdi. E por mais estranho que pareça, dormi melhor essa noite.'] },
      { when: (c) => c.done('orc_desercao'), lines: ['Um desertor. Na minha tropa. Ainda tento entender como isso aconteceu.'] },
    ],
  },
  orc_guard: {
    dialogue: ['Hmpf. Ronda é ronda.', 'Se vir o Capitão, finja que está ocupado.'],
    rules: [
      { when: (c) => c.flag('orc_end_a'), lines: ['Fiquei com a concha de sopa. Ainda cheira a você.'] },
      { when: (c) => c.flag('orc_end_b'), lines: ['Sem farda, o ombro dói menos. Quem diria.'] },
      { when: (c) => c.done('orc_volta'), lines: ['Você largou a farda. Eu devia ter largado antes.'] },
    ],
  },
  tico: {
    dialogue: ['Que a ronda seja leve, meu filho.', 'Quem carrega peso demais esquece por que carrega.'],
    rules: [
      { when: (c) => c.flag('orc_end_a') || c.flag('orc_end_b'), lines: ['Hoje é um bom dia para esquecer o peso e lembrar o motivo.'] },
      { when: (c) => c.done('orc_volta'), lines: ['Obedecer não é o mesmo que estar certo. Repita comigo.'] },
    ],
  },
  rival: {
    // Aqui o `rival` continua sendo o Gadigago.
    dialogue: ['Aí, cheguei primeiro de novo!', 'Vim treinar na praça. Se quer lutar, é só falar.'],
    rules: [
      { when: (c) => c.done('orc_gadigago'), lines: ['Você pensou melhor, não pensou? Dá para ver na cara.'] },
    ],
  },
  marina: {
    rules: [
      { when: (c) => c.flag('orc_end_c'), lines: ['Leve pão para quem precisar. É só o que eu peço.'] },
      { when: (c) => c.done('orc_consertar'), lines: ['A loja voltou ao normal graças a você. Passe aqui quando quiser.'] },
    ],
  },
  toinho: {
    rules: [
      { when: (c) => c.done('orc_consertar'), lines: ['O orc decente! Já contei para toda a praça. Tome um desconto de amigo.'] },
    ],
  },
  iracema: {
    rules: [
      { when: (c) => c.flag('orc_end_a'), lines: ['A capa ficou linda, não ficou? Sem emblema nenhum. É sua.'] },
      { when: (c) => c.flag('orc_end_c'), lines: ['Se um dia passar por aqui, tem um quarto vazio. Sempre tem.'] },
      { when: (c) => c.done('orc_consertar'), lines: ['Fique à vontade. Quem carrega peso por um bom motivo sempre tem lugar aqui.'] },
    ],
  },
  footman_dog: {
    rules: [
      { when: (c) => c.done('orc_desercao'), lines: ['Au! O desertor mais decente da ilha! Tem sopa quando quiser.'] },
    ],
  },
  tank_dog: {
    rules: [
      { when: (c) => c.done('orc_tank'), lines: ['Quem larga a farda por decência é bem-vindo na ilha.'] },
    ],
  },
  barqueiro: {
    rules: [
      { when: (c) => c.flag('orc_end_c'), lines: ['Para onde hoje? Qualquer lugar onde precisem de braços fortes?'] },
    ],
  },
};

export const ORC_CAMPAIGN: CampaignDef = {
  id: 'orc',
  missions: MISSIONS,
  choices: CHOICES,
  endings: ENDINGS,
  cutscenes: ORC_CUTSCENES,
  npcOverrides: NPC_OVERRIDES,
  alwaysActive: [],
  extraPlacements: [{ npcId: 'eremita', x: ORC_SPY_SPOT.x, y: ORC_SPY_SPOT.y, afterMission: 'orc_provas', hideAfterMission: 'orc_espiao' }],
  summary: [
    'Soldado raso da Legião Cinzenta, o Orc obedece e não pergunta, até o dia em que a ordem é tirar comida de quem não tem. Ele deserta, devolve o que ajudou a tirar e volta ao acampamento sem farda para enfrentar o único homem que pode dispensá-lo com honra.',
    'A rank-and-file soldier of the Grey Legion, the Orc obeys and never asks, until the day the order is to take food from people who have none. He deserts, returns what he helped take, and goes back to camp without a uniform to face the only man who can discharge him with honor.',
    'Soldado raso de la Legión Gris, el Orco obedece y no pregunta, hasta el día en que la orden es quitarle comida a quien no tiene. Deserta, devuelve lo que ayudó a quitar y vuelve al campamento sin uniforme para enfrentar al único hombre que puede darlo de baja con honor.',
    'Simple soldat de la Légion Grise, l’Orc obéit sans poser de questions, jusqu’au jour où l’ordre est de prendre la nourriture de ceux qui n’en ont pas. Il déserte, rend ce qu’il a aidé à prendre, et retourne au camp sans uniforme pour affronter le seul homme qui peut le congédier avec honneur.',
    '灰色の軍団の下っ端兵士オークは、命令に従い、質問しない。食べ物のない人々から食料を取り上げよという命令が下る日までは。彼は脱走し、奪ったものを返し、軍服を脱いだまま野営地に戻って、名誉ある除隊を与えられる唯一の男に挑む。',
  ],
  tagline: ['Farda Cinzenta, Consciência Cinzenta', 'Grey Uniform, Grey Conscience', 'Uniforme Gris, Conciencia Gris', 'Uniforme gris, conscience grise', '灰色の軍服、灰色の良心'],
};
