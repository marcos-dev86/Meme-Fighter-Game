import type { MissionDef } from '../missionTypes';
import type { CampaignChoice, CampaignDef, CampaignEnding, CampaignNpcOverride } from './campaignTypes';
import { GADIGAGO_CUTSCENES } from './gadigagoCutscenes';

/**
 * CAMPANHA DO GADIGAGO: "O Eterno Segundo". 11 missões em 5 atos + a missão final (escolha do clímax).
 * Decisões fixas: no mundo do Gadigago o NPC `rival` da praça é o DOGGE; o Maior Fã usa o lutador NINJA e o NPC
 * Mercador da Madrugada (sempre ativo); o jogador começa na porta da casa dele (879, 934).
 * Os textos de NPC e de missão são em português (como os do Dogge); as cutscenes e os finais têm os 5 idiomas.
 */
const FINAL_TITLE = 'Meme Fighter'; // mesmo valor de FINAL_MISSION_TITLE (characters.ts); repetido aqui para evitar ciclo de import

const A1 = 'Ato 1 · O Convite';
const A2 = 'Ato 2 · Os Mestres';
const A3 = 'Ato 3 · O Espelho';
const A4 = 'Ato 4 · Quem Ficou Esperando';
const SEC = 'Segredos do Gadigago';
const A5 = 'Ato 5 · O Maior Fã';

/** Posição da estátua da praça (igual a STATUE_TILE em world/worldGen.ts; o teste confere). */
export const GAD_STATUE = { x: 1016, y: 826 };

const MISSIONS: MissionDef[] = [
  {
    id: 'gad_convite', title: 'O Envelope sem Remetente', hint: 'Há um envelope sob a estátua da praça, a leste da vila.', type: 'quest', chapter: A1, reward: { coins: 30, xp: 90 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'reach', x: GAD_STATUE.x, y: GAD_STATUE.y, r: 6, hint: 'Vá até a estátua da praça: dizem que há um envelope sob ela.' },
        { kind: 'talk', npcId: 'pipoca', hint: 'Pipoca viu você pegar o envelope. Fale com ela, na praça.', lines: ['Eu vi! Eu vi você pegar o envelope!', 'Quatro mestres, cinco provas e um troféu? Nossa! Você vai, né? Eu torço por você!', 'Mas... volta a tempo do meu aniversário, tá? É daqui a pouco.'] },
      ],
    },
  },
  {
    id: 'gad_rei', title: 'Primeiro Mestre: o Rei dos Cães', hint: 'O Rei dos Cães ensina honra e humilhação. Pegue o barco para a Ilha dos Cães.', type: 'battle', chapter: A2, requires: ['gad_convite'],
    objective: { kind: 'battle', giver: 'dogking', opponent: 'dogking', stageKey: 'stage_11', reward: 60, offerTitleKey: 'quest_gad_rei_offer' },
    dialogue: {
      unstarted: ['Então você é o convidado. O envelope falava de um treino, e eu aceito treinar quem tem fome.', 'Primeira lição: honra. Quem perde bem, ganha o respeito dos cães. Quem perde mal, aprende a cavar buraco.'],
      active: ['Venha. Mostre o que o seu orgulho sabe fazer.'],
      completed: ['Você caiu três vezes e levantou quatro. Isso é honra.', 'Vá ao acampamento. O Capitão Ferro é o próximo.'],
    },
  },
  {
    id: 'gad_ferro', title: 'Segundo Mestre: a Disciplina do Capitão', hint: 'O Capitão Ferro, no acampamento da Legião Cinzenta, ensina disciplina e silêncio.', type: 'battle', chapter: A2, requires: ['gad_rei'], reward: { flag: 'isl_open_gelo' },
    objective: { kind: 'battle', giver: 'soldier_captain', opponent: 'soldier', stageKey: 'stage_10', reward: 70, offerTitleKey: 'quest_gad_ferro_offer' },
    dialogue: {
      unstarted: ['Em fila. Sem conversa. O envelope me pagou para te ensinar a calar a boca e a ouvir o corpo.', 'Seu golpe é rápido e seu ouvido é lento. Vamos consertar isso.'],
      active: ['Em posição. Sem discurso.'],
      completed: ['Silêncio também é um golpe. Agora vá ao frio: os marujos já levam você à Ilha Gelada.'],
    },
  },
  {
    id: 'gad_helga', title: 'Terceiro Mestre: Paciência na Neve', hint: 'Na Ilha Gelada, fale com a Helga, ao pé do penhasco, e depois com o Rocha.', type: 'quest', chapter: A2, requires: ['gad_ferro'], reward: { coins: 60, items: { chili: 2 }, xp: 120 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'alpinista', hint: 'Fale com a Helga, a alpinista, ao pé do penhasco gelado.', lines: ['Você veio treinar na neve? Aqui ninguém corre: quem corre escorrega.', 'Meu avô dizia que o gelo ensina a esperar. Vá falar com o Rocha, ele guarda o resto da aula.'] },
        { kind: 'talk', npcId: 'rocha', hint: 'Suba até o Rocha, na montanha.', lines: ['Paciência não é parar. É saber quando o golpe certo chega.', 'Eu te desafio, mas só depois que você respirar três vezes. Vai, respire.'] },
      ],
    },
  },
  {
    id: 'gad_rocha', title: 'A Prova do Rocha', hint: 'O Rocha quer testar sua paciência em um duelo na neve.', type: 'battle', chapter: A2, requires: ['gad_helga'], reward: { flag: 'isl_open_vulcao' },
    objective: { kind: 'battle', giver: 'rocha', opponent: 'tank', stageKey: 'stage_5', reward: 90, offerTitleKey: 'quest_gad_rocha_offer' },
    dialogue: {
      unstarted: ['Respirou? Então vamos. Quem perde a paciência perde a luta.'],
      active: ['De novo? Ótimo. Gosto de quem insiste.'],
      completed: ['A montanha é sua por hoje. O último mestre mora no vulcão e não tem paciência nenhuma.'],
    },
  },
  {
    id: 'gad_vulcao', title: 'Quarto Mestre: Força e Dever', hint: 'O Guardião do Vulcão ensina força e dever. Os barcos agora levam você ao Vulcão.', type: 'battle', chapter: A2, requires: ['gad_rocha'],
    objective: { kind: 'battle', giver: 'tank_vulcao', opponent: 'tank', stageKey: 'stage_4', reward: 110, offerTitleKey: 'quest_gad_vulcao_offer' },
    dialogue: {
      unstarted: ['Força sem dever é só barulho. Dever sem força é só desculpa.', 'O envelope disse que você quer ser visto. Então me mostre o que você carrega nas costas.'],
      active: ['Mais uma. A lava não perdoa quem hesita.'],
      completed: ['Você ficou mais forte. E mais cego. Escute o que digo: volte à praça antes que seja tarde.'],
    },
  },
  {
    id: 'gad_espelho', title: 'O Espelho', hint: 'Volte à praça. O Vovô Bento preparou um treino com um espelho.', type: 'battle', chapter: A3, requires: ['gad_vulcao'],
    objective: { kind: 'battle', giver: 'bento', opponent: 'gadigago', stageKey: 'stage_4', reward: 100, offerTitleKey: 'quest_gad_espelho_offer' },
    dialogue: {
      unstarted: ['Ah, você voltou magro e todo cheio de cicatriz. Sente, sente.', 'Trouxe um espelho velho que era da sua mãe. Não olhe para ele com os olhos. Lute com ele.'],
      active: ['O espelho não cansa, meu jovem. Quem cansa é quem luta contra si mesmo.'],
      completed: ['O espelho rachou, e olha só: você ainda está inteiro. Agora precisa enfrentar quem sempre esteve do outro lado.'],
    },
  },
  {
    id: 'gad_dogge', title: 'Revanche de Treino', hint: 'O rival de sempre espera na praça: Dogge.', type: 'battle', chapter: A3, requires: ['gad_espelho'],
    objective: { kind: 'battle', giver: 'rival', opponent: 'dogge', stageKey: 'stage_1', reward: 120, offerTitleKey: 'quest_gad_dogge_offer' },
    dialogue: {
      unstarted: ['Ouvi falar dos quatro mestres. Cinco provas, né? Esta é a sua quinta.', 'Sem trapaça, sem público. Só eu e você, como antes.'],
      active: ['Estou pronto. Só quero saber se você também está.'],
      completed: ['Boa luta. De verdade. Você não lutou contra mim, lutou para me alcançar. Eu vi.'],
    },
  },
  {
    id: 'gad_volta', title: 'Quem Ficou Esperando', hint: 'Você perdeu muita coisa. Procure Dona Iracema, o Vovô Bento e a Pipoca.', type: 'quest', chapter: A4, requires: ['gad_dogge'], reward: { coins: 50, items: { bread: 3 }, xp: 140 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'iracema', hint: 'Dona Iracema ficou com o cachecol que bordou para você. Vá até a casa dela.', lines: ['Ah, você veio. O cachecol ficou pronto no inverno e agora já é verão.', 'Não precisa pedir desculpa. Vem, deixe eu ver se ainda serve.'] },
        { kind: 'talk', npcId: 'bento', hint: 'Fale com o Vovô Bento, na praça. Ele fez chá para você.', lines: ['O chá esfriou duas vezes. Esquentei de novo.', 'O troféu de Verdadeiro Meme Fighter não existe, meu jovem. Quem inventou isso tem interesse em te ver correndo.'] },
        { kind: 'talk', npcId: 'pipoca', hint: 'Pipoca está sentada na escada da praça. Fale com ela.', lines: ['Você perdeu meu aniversário. Tudo bem. A pipa quebrou também.', 'Sabe quem aplaudia a sua luta lá do fundo? Um moço de capuz que vende ingressos. Ele nunca olha para você, só para o dinheiro.'] },
      ],
    },
  },
  {
    id: 'gad_fa', title: 'O Maior Fã', hint: 'O Mercador da Madrugada vende ingressos para a sua rivalidade. Ele fica na praça.', type: 'battle', chapter: A5, requires: ['gad_volta'],
    objective: { kind: 'battle', giver: 'mercador_noturno', opponent: 'ninja', stageKey: 'stage_2', reward: 150, offerTitleKey: 'quest_gad_fa_offer' },
    dialogue: {
      unstarted: ['Ingressos! Apostas! O maior duelo da praça, ao vivo!', 'Ah, o astro em pessoa. Não me olhe assim: eu sou seu maior fã. Quem mais pagaria para ver você perder, perder e perder de novo?'],
      active: ['Vamos. A plateia já está sentada.'],
      completed: ['Você me venceu... mas o contrato ainda está no chão. Pense bem antes de rasgar.'],
    },
  },
  {
    id: 'gad_final', title: FINAL_TITLE, hint: 'O contrato do Maior Fã ficou na praça. Fale com o Vovô Bento e decida como a rivalidade termina.', type: 'quest', chapter: A5, final: true, requires: ['gad_fa'],
    objective: { kind: 'flag', flag: 'gad_choice_done' },
  },
  // ---- SECRETAS (opcionais: aparecem como "???" até serem descobertas e não são exigidas para o final)
  {
    id: 'gad_sec_autografos', title: 'O Caderno de Autógrafos', hint: 'Pipoca quer assinaturas dos mestres que treinaram você. Passe na praça e converse com ela de novo.', type: 'quest', chapter: SEC, optional: true, secret: true,
    requires: ['gad_ferro'], discover: { talk: 'pipoca' }, reward: { coins: 100, xp: 260, items: { chili: 2 } },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'dogking', hint: 'Peça ao Rei dos Cães que assine o caderno da Pipoca, na Ilha dos Cães.', lines: ['Um caderno de autógrafos? Para uma criança? Dê aqui.', '(O Rei desenha uma pata enorme e assina com a coroa.) Diga a ela que honra também é saber se divertir.'] },
        { kind: 'talk', npcId: 'soldier_captain', hint: 'Peça ao Capitão Ferro que assine, no acampamento.', lines: ['Isto não está no regulamento. Mas o regulamento não tem nada contra uma criança.', '(O Capitão assina com letra de formulário.) Entregue. Em silêncio, de preferência.'] },
        { kind: 'talk', npcId: 'pipoca', hint: 'Leve o caderno cheio de volta à Pipoca, na praça.', lines: ['Um rei E um capitão?! Eu vou dormir abraçada nele!', 'Sabe o que eu acho? Você nunca foi o segundo. Você é o que todo mundo quer ao lado.'] },
      ],
    },
  },
  {
    id: 'gad_sec_noite', title: 'A Noite do Segundo Lugar', hint: 'O Mercador da Madrugada paga bem a quem prova a sorte. Fale com ele na praça.', type: 'quest', chapter: SEC, optional: true, secret: true,
    discover: { talk: 'mercador_noturno' }, reward: { coins: 180, xp: 320, items: { midnight_brew: 1 } },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'casino', wins: 2, hint: 'Ganhe 2 rodadas no cassino: o Mercador quer ver se o segundo lugar tem sorte.' },
        { kind: 'talk', npcId: 'mercador_noturno', hint: 'Volte ao Mercador da Madrugada e mostre o resultado.', lines: ['Duas vitórias seguidas... O segundo lugar tem mais fôlego do que dizem.', 'Eu vendo ingressos para a sua rivalidade, mas hoje o ingresso é seu. Leve isto, de cortesia. Não é suborno. (É só um pouco.)'] },
      ],
    },
  },
  {
    id: 'gad_sec_nivel', title: 'Segundo, mas Não Último', hint: 'Dona Iracema acha que você ainda não percebeu o quanto cresceu.', type: 'quest', chapter: SEC, optional: true, secret: true,
    requires: ['gad_vulcao'], discover: { talk: 'iracema' }, reward: { coins: 220, xp: 400 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'level', level: 12, hint: 'Chegue ao nível 12 para provar que o treino valeu.' },
        { kind: 'talk', npcId: 'iracema', hint: 'Mostre a Dona Iracema como você cresceu.', lines: ['Nível 12! Eu lembro quando você mal levantava um balde.', 'Segundo lugar? Ora. Quem corre atrás sempre chega mais forte do que quem ficou na frente.'] },
      ],
    },
  },
];

const CHOICES: CampaignChoice[] = [
  {
    id: 'gad_final',
    npcId: 'bento',
    afterMission: 'gad_fa',
    intro: [
      'O Mercador sumiu e deixou este contrato na praça. Aqui diz: "Cadeira cativa no espetáculo, para sempre."',
      'A rivalidade com o Dogge é sua, meu jovem. Quem decide como ela acaba é você, e ninguém mais.',
    ],
    options: [
      { id: 'encerrar', label: 'Rasgar o contrato: encerrar o espetáculo.', lines: ['Você rasga o papel em quatro, depois em oito. O vento leva os pedaços. A praça inteira parece respirar.'], flags: ['gad_end_a', 'gad_choice_done'], xp: 200 },
      { id: 'recusar', label: 'Guardar o título: a rivalidade nunca termina.', lines: ['Você dobra o contrato e guarda no bolso. "Eu venci. É isso que importa." Bento não diz nada.'], flags: ['gad_end_b', 'gad_choice_done'], xp: 200 },
      { id: 'aceitar', label: 'Assinar o contrato: virar o astro do espetáculo.', lines: ['Você assina com a letra firme de quem não treme. O papel brilha por um instante. Bento sai da praça sem se despedir.'], flags: ['gad_end_c', 'gad_choice_done'], xp: 200 },
    ],
  },
];

const ENDINGS: CampaignEnding[] = [
  {
    id: 'gad_end_a', flag: 'gad_end_a', kind: 'union', cutsceneId: 'gad_end_a',
    title: ['O TROFÉU QUE NINGUÉM ENTREGA', 'THE TROPHY NOBODY HANDS OUT', 'EL TROFEO QUE NADIE ENTREGA', 'LE TROPHÉE QUE PERSONNE NE REMET', '誰も渡さないトロフィー'],
    lines: [
      ['Quando o Maior Fã se desfez em papel e aplausos gravados, a praça ficou em silêncio.', 'When the Biggest Fan fell apart into paper and recorded applause, the plaza went quiet.', 'Cuando el Mayor Fan se deshizo en papel y aplausos grabados, la plaza quedó en silencio.', 'Quand le Plus Grand Fan s’est défait en papier et en applaudissements enregistrés, la place est devenue silencieuse.', '最大のファンが紙と録音された拍手になって消えると、広場は静まり返った。'],
      ['{player} procurou o troféu de Verdadeiro Meme Fighter e só achou uma moldura vazia, pendurada por ele mesmo.', '{player} looked for the True Meme Fighter trophy and found only an empty frame, hung up by himself.', '{player} buscó el trofeo de Verdadero Meme Fighter y solo halló un marco vacío, colgado por él mismo.', '{player} a cherché le trophée du Vrai Meme Fighter et n’a trouvé qu’un cadre vide, accroché par lui-même.', '{player}は真のミームファイターのトロフィーを探したが、自分で掛けた空の額縁しかなかった。'],
      ['Dogge chegou atrasado, com Pipoca nos ombros e a pipa consertada. O aperto de mão quase virou luta.', 'Dogge arrived late, with Pipoca on his shoulders and the kite fixed. The handshake almost turned into a fight.', 'Dogge llegó tarde, con Pipoca en los hombros y la cometa arreglada. El apretón de manos casi se volvió pelea.', 'Dogge est arrivé en retard, avec Pipoca sur les épaules et le cerf-volant réparé. La poignée de main a failli virer au combat.', 'ドッゲはポポカを肩に乗せ、直した凧を持って遅れて到着した。握手はあやうくケンカになりかけた。'],
      ['O Vovô Bento escreveu no caderno da praça: "Verdadeiro Meme Fighter: quem aparece quando alguém precisa."', 'Grandpa Bento wrote in the plaza notebook: "True Meme Fighter: whoever shows up when someone needs them."', 'El Abuelo Bento escribió en el cuaderno de la plaza: "Verdadero Meme Fighter: quien aparece cuando alguien lo necesita."', 'Papi Bento a écrit dans le cahier de la place : « Vrai Meme Fighter : celui qui est là quand on a besoin de lui. »', 'ベント爺さんは広場のノートに書いた。「真のミームファイターとは、誰かが必要なときに現れる者。」'],
      ['A rivalidade continua, agora com hora marcada, regras e lanche.', 'The rivalry goes on, now with a set time, rules and a snack.', 'La rivalidad continúa, ahora con hora fija, reglas y merienda.', 'La rivalité continue, maintenant avec un horaire, des règles et un goûter.', 'ライバル関係は続く。今は時間と、ルールと、おやつ付きで。'],
    ],
  },
  {
    id: 'gad_end_b', flag: 'gad_end_b', kind: 'glory', cutsceneId: 'gad_end_b',
    title: ['A REVANCHE SEM PLATEIA', 'THE REMATCH WITHOUT AN AUDIENCE', 'LA REVANCHA SIN PÚBLICO', 'LA REVANCHE SANS PUBLIC', '観客のいない再戦'],
    lines: [
      ['{player} venceu a luta e ficou com o título de campeão da praça.', '{player} won the fight and kept the title of plaza champion.', '{player} ganó la pelea y se quedó con el título de campeón de la plaza.', '{player} a gagné le combat et gardé le titre de champion de la place.', '{player}は勝ち、広場のチャンピオンの称号を手にした。'],
      ['Mas a praça estava vazia: todos tinham ido para casa.', 'But the plaza was empty: everyone had gone home.', 'Pero la plaza estaba vacía: todos se habían ido a casa.', 'Mais la place était vide : tout le monde était rentré.', 'けれど広場は空っぽだった。みんな家に帰ってしまっていた。'],
      ['Pipoca dormia na escada, com a pipa quebrada no colo.', 'Pipoca slept on the stairs, the broken kite in his lap.', 'Pipoca dormía en la escalera, con la cometa rota en el regazo.', 'Pipoca dormait sur l’escalier, le cerf-volant cassé sur les genoux.', 'ポポカは壊れた凧を膝に抱えて階段で眠っていた。'],
      ['{player} sentou no degrau ao lado e ficou ali, em silêncio.', '{player} sat on the step beside him and stayed there, in silence.', '{player} se sentó en el escalón a su lado y se quedó allí, en silencio.', '{player} s’est assis sur la marche à côté de lui et est resté là, en silence.', '{player}は隣の段に座り、黙ったまま、そこにいた。'],
      ['Amanhã vai treinar de manhã e de tarde, e vai ligar para o Dogge à noite. Vencer sozinho tem gosto de vazio.', 'Tomorrow he will train morning and afternoon, and call Dogge at night. Winning alone tastes like emptiness.', 'Mañana entrenará por la mañana y por la tarde, y llamará a Dogge por la noche. Ganar solo sabe a vacío.', 'Demain il s’entraînera matin et après-midi, et appellera Dogge le soir. Gagner seul a un goût de vide.', '明日は朝も午後も練習して、夜にはドッゲに電話する。ひとりで勝つのは、空っぽの味がする。'],
    ],
  },
  {
    id: 'gad_end_c', flag: 'gad_end_c', kind: 'power', cutsceneId: 'gad_end_c',
    title: ['O ESPETÁCULO CONTINUA', 'THE SHOW GOES ON', 'EL ESPECTÁCULO CONTINÚA', 'LE SPECTACLE CONTINUE', 'ショーは続く'],
    lines: [
      ['{player} assumiu o espetáculo: ingressos, torcida, bonés e cartazes.', '{player} took over the show: tickets, cheering crowds, caps and posters.', '{player} se quedó con el espectáculo: entradas, hinchada, gorras y carteles.', '{player} a repris le spectacle : billets, supporters, casquettes et affiches.', '{player}はショーを引き継いだ。チケット、応援団、帽子、ポスター。'],
      ['A praça nunca teve tanta gente, e nunca teve tão pouca conversa.', 'The plaza never had so many people, and never so little conversation.', 'La plaza nunca tuvo tanta gente, ni tan poca conversación.', 'La place n’a jamais eu autant de monde, ni si peu de conversation.', '広場にこれほど人が集まったことはなく、これほど会話がなかったこともない。'],
      ['Dogge apareceu, olhou para ele e não disse nada.', 'Dogge showed up, looked at him and said nothing.', 'Dogge apareció, lo miró y no dijo nada.', 'Dogge est apparu, l’a regardé et n’a rien dit.', 'ドッゲが現れ、彼を見つめ、何も言わなかった。'],
      ['O título era dele. O resto, não.', 'The title was his. The rest was not.', 'El título era suyo. Lo demás, no.', 'Le titre était à lui. Le reste, non.', '称号は彼のものだった。それ以外は、違った。'],
      ['Em algum lugar, alguém ainda guardava uma moldura vazia, esperando.', 'Somewhere, someone still kept an empty frame, waiting.', 'En algún lugar, alguien aún guardaba un marco vacío, esperando.', 'Quelque part, quelqu’un gardait encore un cadre vide, en attendant.', 'どこかで、誰かがまだ空の額縁を持って、待っていた。'],
    ],
  },
];

const NPC_OVERRIDES: Record<string, CampaignNpcOverride> = {
  // O rival da praça, no mundo do Gadigago, é o Dogge.
  rival: {
    name: 'Dogge', role: 'Seu Rival', fighterSprite: 'dogge', kind: 'meme',
    dialogue: ['E aí, Gadigago! Vim treinar na praça.', 'Quando quiser uma revanche, é só falar.'],
    rules: [
      { when: (c) => c.flag('gad_end_a'), lines: ['Marcamos para sábado, com lanche. E dessa vez você paga o suco.'] },
      { when: (c) => c.flag('gad_end_b'), lines: ['Ei. Posso sentar aqui? Sem luta. Só sentar.'] },
      { when: (c) => c.flag('gad_end_c'), lines: ['...', '(Dogge te olha por um bom tempo e não diz nada.)'] },
      { when: (c) => c.done('gad_dogge'), lines: ['Eu estarei aqui na praça quando você precisar. Sem plateia, sem aposta.'] },
      { when: (c) => c.done('gad_vulcao'), lines: ['Você sumiu por semanas. A Pipoca perguntava por você todo dia.'] },
    ],
  },
  mercador_noturno: {
    name: 'Mercador da Madrugada', role: 'Vende ingressos e apostas', fighterSprite: 'ninja', kind: 'meme',
    dialogue: ['Ingressos! Apostas! Quem leva o Dogge? Quem leva o Gadigago?', 'Não me olhe assim, só vendo o que a praça quer ver.'],
    rules: [
      { when: (c) => c.flag('gad_end_c'), lines: ['Fez a escolha certa, astro. Já tem fila dobrando a esquina.'] },
      { when: (c) => c.done('gad_fa'), lines: ['(O encapuzado não está mais aqui. Só sobrou um cartaz rasgado.)'] },
    ],
  },
  pipoca: {
    dialogue: ['Eu treino todo dia pra ficar forte que nem você!', 'Quando o seu aniversário chegar, eu vou fazer bolo.'],
    rules: [
      { when: (c) => c.flag('gad_end_a'), lines: ['A pipa está consertada! O Dogge me carregou nos ombros e eu vi a praça toda lá de cima!'] },
      { when: (c) => c.flag('gad_end_b'), lines: ['*Pipoca dorme na escada com a pipa quebrada no colo.*'] },
      { when: (c) => c.flag('gad_end_c'), lines: ['Tem tanta gente... mas ninguém quer conversar. Você me ensina uma luta?'] },
      { when: (c) => c.done('gad_volta'), lines: ['Cuidado com o moço de capuz, hein?'] },
      { when: (c) => c.done('gad_convite'), lines: ['Quando você voltar, a gente solta a pipa. Prometeu!'] },
    ],
  },
  bento: {
    dialogue: ['A praça fica mais quieta quando você treina longe, meu jovem.', 'Mas sempre há chá, sempre há lugar.'],
    rules: [
      { when: (c) => c.flag('gad_end_a'), lines: ['Escrevi no caderno da praça o que é um Verdadeiro Meme Fighter. Vá ler quando quiser.'] },
      { when: (c) => c.flag('gad_end_b'), lines: ['Venceu. E agora? A escada está fria, meu jovem.'] },
      { when: (c) => c.flag('gad_end_c'), lines: ['Já não reconheço a praça. Mas ainda tenho chá, se um dia você quiser.'] },
      { when: (c) => c.done('gad_volta'), lines: ['Você voltou. Isso é o que importa.'] },
    ],
  },
  iracema: {
    dialogue: ['O cachecol está quase pronto. Falta só você aparecer para provar.', 'Não tenha pressa. Tenha vontade.'],
    rules: [
      { when: (c) => c.done('gad_volta'), lines: ['Ficou bom, não ficou? Cada ponto foi pensando em você voltando.'] },
    ],
  },
  dogking: {
    rules: [
      { when: (c) => c.done('gad_rei'), lines: ['Quem aprendeu honra comigo é bem-vindo na ilha.'] },
    ],
  },
  soldier_captain: {
    rules: [
      { when: (c) => c.done('gad_ferro'), lines: ['Silêncio é uma arma. Use com sabedoria.'] },
    ],
  },
  alpinista: {
    rules: [
      { when: (c) => c.done('gad_helga'), lines: ['Respire. A montanha te espera, mas ela não corre.'] },
    ],
  },
  rocha: {
    rules: [
      { when: (c) => c.done('gad_rocha'), lines: ['Paciência. Esse foi o único golpe que importava.'] },
    ],
  },
  tank_vulcao: {
    rules: [
      { when: (c) => c.done('gad_vulcao'), lines: ['Cumpra o seu dever na praça. Aqui já cumpriu o seu.'] },
    ],
  },
};

export const GADIGAGO_CAMPAIGN: CampaignDef = {
  id: 'gadigago',
  missions: MISSIONS,
  choices: CHOICES,
  endings: ENDINGS,
  cutscenes: GADIGAGO_CUTSCENES,
  npcOverrides: NPC_OVERRIDES,
  alwaysActive: ['mercador_noturno'],
  extraPlacements: [],
  summary: [
    'O rival eterno do Dogge cansou de chegar em segundo. Um envelope sem remetente oferece quatro mestres, cinco provas e um troféu. No caminho, a rivalidade o faz esquecer quem esperava por ele, e alguém lucra com isso.',
    'Dogge’s eternal rival is tired of finishing second. A sender-less envelope offers four masters, five trials and a trophy. Along the way the rivalry makes him forget who was waiting for him, and someone profits from it.',
    'El eterno rival de Dogge se cansó de llegar segundo. Un sobre sin remitente ofrece cuatro maestros, cinco pruebas y un trofeo. En el camino, la rivalidad le hace olvidar a quien lo esperaba, y alguien lucra con eso.',
    'L’éternel rival de Dogge en a assez d’être deuxième. Une enveloppe sans expéditeur offre quatre maîtres, cinq épreuves et un trophée. En chemin, la rivalité lui fait oublier ceux qui l’attendaient, et quelqu’un en profite.',
    'ドッゲの永遠のライバルは、2位に飽きた。差出人不明の封筒が、4人の師匠と5つの試練とトロフィーを約束する。旅の中で、ライバル関係のせいで待っていた人々を忘れていく。そしてそれで儲ける者がいる。',
  ],
  tagline: ['O Eterno Segundo', 'The Eternal Runner-Up', 'El Eterno Segundo', 'L’Éternel Deuxième', '永遠の2位'],
};
